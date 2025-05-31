// 교사 웹소켓 핸들러
const KahootQuizSession = require("../models/KahootQuizSession");
const QuizResult = require("../models/QuizResult");
const { redisClient } = require("../utils/redisClient");
const logger = require("../utils/logger");
const WebSocket = require("ws");
const {
  kahootClients,
  broadcastToStudents,
  broadcastToActiveStudents,
  setupKeepAlive,
  subscribeToPinChannels,
  unsubscribeFromPinChannels,
} = require("./kahootShared");
const {
  getSessionKey,
  getSessionQuestionsKey,
  getSessionStudentIdsSetKey,
  getParticipantKey,
  getSessionTakenCharactersSetKey,
} = require("../utils/redisKeys");
const {
  redisJsonGet,
  redisJsonSet,
  redisJsonMGet,
} = require("../utils/redisUtils");

// 내부 헬퍼 함수: 세션 리소스 정리
// 이 함수는 퀴즈 세션 종료 시 관련된 Redis 데이터 삭제, 학생 연결 종료 등의 정리 작업을 수행합니다.
// KahootQuizSession 문서는 DB에서 삭제하지 않고 보존합니다.
async function _cleanupSessionResources(pin, ws, options = {}) {
  const {
    notifyStudents = true, // true일 경우 학생들에게 세션 종료 알림
    closeStudentSockets = true, // true일 경우 학생 웹소켓 연결 강제 종료
    closeTeacherSocket = false, // true일 경우 교사 웹소켓 연결 강제 종료 (일반적으로는 불필요)
  } = options;

  logger.info(`Starting cleanup for session PIN: ${pin}`);

  // 1. 학생들에게 알림 및 연결 종료 (옵션)
  if (notifyStudents) {
    await broadcastToStudents(pin, {
      type: "sessionEnded",
      message: "퀴즈가 종료되었습니다.",
    });
    logger.info(`Notified students in session ${pin} about session end.`);
  }

  if (
    closeStudentSockets &&
    kahootClients[pin] &&
    kahootClients[pin].students
  ) {
    Object.values(kahootClients[pin].students).forEach((studentWs) => {
      if (studentWs.readyState === WebSocket.OPEN) {
        studentWs.close();
      }
    });
    logger.info(`Closed student WebSockets for session ${pin}.`);
  }

  // 2. Redis 데이터 삭제
  try {
    const sessionKey = getSessionKey(pin);
    const questionsKey = getSessionQuestionsKey(pin);
    const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
    const takenCharactersSetKey = getSessionTakenCharactersSetKey(pin);

    const keysToDeleteInitially = [
      sessionKey,
      questionsKey,
      takenCharactersSetKey,
    ];

    // 학생 ID Set에서 모든 학생 ID를 가져와 각 참여자 데이터 키를 삭제
    const studentIds = await redisClient.sMembers(studentIdsSetKey);
    if (studentIds && studentIds.length > 0) {
      const participantKeysToDelete = studentIds.map((sid) =>
        getParticipantKey(pin, sid)
      );
      keysToDeleteInitially.push(...participantKeysToDelete);
    }

    // 마지막으로 학생 ID Set 자체를 삭제 목록에 추가
    keysToDeleteInitially.push(studentIdsSetKey);

    // 중복 제거 (혹시 모를 경우 대비)
    const finalKeysToDelete = [...new Set(keysToDeleteInitially)];

    if (finalKeysToDelete.length > 0) {
      const deletedCount = await redisClient.del(finalKeysToDelete); // 배열을 직접 전달
      logger.info(
        `Attempted to delete ${finalKeysToDelete.length} Redis keys for session ${pin}. Successfully deleted ${deletedCount} keys.`
      );
      if (deletedCount < finalKeysToDelete.length) {
        logger.warn(
          `Not all keys were deleted for session ${pin}. Expected ${finalKeysToDelete.length}, got ${deletedCount}. Some keys might have already been deleted or did not exist.`
        );
        // 어떤 키가 삭제되지 않았는지 확인하려면, 삭제 시도 전에 각 키의 존재 여부를 EXISTS로 확인하거나,
        // 삭제 후 다시 MGET 등으로 확인하는 추가 로직이 필요하나, 여기서는 단순화합니다.
      }
    } else {
      logger.info(`No Redis keys found to delete for session ${pin}.`);
    }
  } catch (redisError) {
    logger.error(
      `Error during Redis data cleanup for session ${pin}:`, // 에러 메시지 수정
      redisError
    );
  }

  // 3. DB에서 KahootQuizSession 문서 삭제 로직은 완전히 제거됨.
  //    KahootQuizSession 문서는 퀴즈 기록 및 분석을 위해 항상 보존됨.
  logger.info(
    `KahootQuizSession document in DB for PIN ${pin} is preserved (no deletion during cleanup).`
  );

  // 4. kahootClients 객체에서 세션 정보 삭제
  if (kahootClients[pin]) {
    delete kahootClients[pin];
    logger.info(`Removed session ${pin} from kahootClients.`);
  }

  // 5. 교사 웹소켓 닫기 (옵션)
  if (closeTeacherSocket && ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
    logger.info(`Closed teacher WebSocket for session ${pin}.`);
  }
  logger.info(`Cleanup finished for session PIN: ${pin}`);
}

// 새로운 헬퍼 함수: 퀴즈 결과 저장
async function _saveQuizResults(
  pin,
  sessionStateToUse, // Redis 세션 메타데이터 (sessionId, subject, semester, unit, teacherId, totalQuestions 등 포함 가정)
  questionContent, // 핸들러 메모리에 로드된 해당 세션의 문제 스냅샷 배열 (전체 문제 수 파악용)
  forUnexpectedClose = false
) {
  logger.info(
    `Attempting to save quiz results for PIN: ${pin}. For unexpected close: ${forUnexpectedClose}`
  );
  try {
    const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
    const studentIds = await redisClient.sMembers(studentIdsSetKey);

    let allParticipants = [];
    if (studentIds && studentIds.length > 0) {
      const participantKeys = studentIds.map((sid) =>
        getParticipantKey(pin, sid)
      );
      const participantDataArray = await redisJsonMGet(participantKeys); // MGET 사용

      if (participantDataArray) {
        allParticipants = participantDataArray.filter((pData, index) => {
          if (pData) {
            return true;
          } else {
            logger.warn(
              `Participant data for studentId ${studentIds[index]} was null or invalid (MGET) during quiz results saving, PIN: ${pin}.`
            );
            return false;
          }
        });
      } else {
        logger.error(
          `Failed to get participant data array via MGET for quiz results saving, PIN: ${pin}.`
        );
        // MGET 실패 시, 빈 배열로 계속 진행하거나 오류를 반환할 수 있음.
        // 여기서는 빈 allParticipants로 진행되어 "No participants with results to save"로 처리될 것임.
      }
    }

    logger.info(
      `Fetched ${allParticipants.length} participants for result processing for session PIN: ${pin}`
    );

    const kahootQuizSessionMongoId = sessionStateToUse.sessionId;
    const { subject, semester, unit /*, teacherId */ } = sessionStateToUse;

    if (
      !kahootQuizSessionMongoId ||
      !subject ||
      !semester ||
      !unit ||
      !questionContent ||
      questionContent.length === 0
    ) {
      logger.error(
        `Essential data missing for saving QuizResult. SessionID: ${kahootQuizSessionMongoId}, Subject: ${subject}, Semester: ${semester}, Unit: ${unit}, TotalQuestions: ${
          questionContent ? questionContent.length : "N/A"
        }`
      );
      return false;
    }

    const totalQuestions = questionContent.length;
    let resultsSavedOrUpdatedCount = 0;

    if (allParticipants.length > 0) {
      for (let participant of allParticipants) {
        if (!participant.student || !participant.responses) {
          logger.warn(
            `Skipping participant with no student ID or responses: ${JSON.stringify(
              participant
            )} for PIN: ${pin}`
          );
          continue;
        }

        const correctAnswersCount = participant.responses.filter(
          (r) => r.isCorrect
        ).length;
        let studentScore = 0;
        if (totalQuestions > 0) {
          studentScore = Math.round(
            (correctAnswersCount / totalQuestions) * 100
          );
        } else {
          studentScore = 0;
        }

        const query = {
          studentId: participant.student,
          sessionId: kahootQuizSessionMongoId,
        };

        const update = {
          $set: {
            subject: subject,
            semester: semester,
            unit: unit,
            results: participant.responses.map((r) => ({
              questionId: r.question,
              studentAnswer: r.answer,
              isCorrect: r.isCorrect,
            })),
            score: studentScore,
            endedAt: new Date(),
          },
        };

        const options = {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        };

        try {
          await QuizResult.findOneAndUpdate(query, update, options);
          resultsSavedOrUpdatedCount++;
        } catch (dbError) {
          logger.error(
            `Error saving/updating QuizResult for student ${participant.student}, session ${kahootQuizSessionMongoId}, PIN ${pin}:`,
            dbError
          );
        }
      }
      logger.info(
        `${resultsSavedOrUpdatedCount} QuizResult documents created/updated for SessionID (Mongo): ${kahootQuizSessionMongoId}, PIN: ${pin}. Unexpected: ${forUnexpectedClose}`
      );
      return resultsSavedOrUpdatedCount > 0;
    } else {
      logger.info(
        `No participants with results to save for SessionID (Mongo): ${kahootQuizSessionMongoId}, PIN: ${pin}.`
      );
      return false;
    }
  } catch (dbError) {
    // 이 catch는 주로 sMembers 또는 MGET 외의 로직에서 발생하는 오류를 잡음
    logger.error(
      `Error during QuizResult saving process for SessionID (Mongo) ${sessionStateToUse?.sessionId}, PIN: ${pin}:`,
      dbError
    );
    return false;
  }
}

// Helper function for 'startQuiz' message
async function _handleStartQuiz(pin, ws, currentSessionState, questionContent) {
  logger.info(`Handling startQuiz for session PIN: ${pin}`);

  const lockKey = `lock:teacher:startquiz:${pin}`;
  let lockAcquired = false;

  try {
    const result = await redisClient.set(lockKey, "locked", "EX", 5, "NX"); // 10초 타임아웃
    lockAcquired = result === "OK";

    if (!lockAcquired) {
      logger.warn(
        `[StartQuiz] Could not acquire lock for PIN ${pin}. Start quiz action likely in progress.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message:
            "퀴즈 시작 요청이 이미 처리 중입니다. 잠시 후 다시 시도해주세요.",
        })
      );
      return;
    }

    // currentSessionState는 메시지 핸들러 시작 시점에서 가져왔으므로,
    // 락을 획득한 후 최신 상태를 다시 한번 가져오는 것이 더 안전할 수 있습니다.
    // 다만, 이 함수는 교사 요청에 의해서만 호출되므로, 아주 짧은 시간 내 동시 요청 가능성은 낮습니다.
    // 여기서는 일단 기존 currentSessionState를 사용하되, 필요시 재조회 로직 추가 가능.
    // 최신 상태를 다시 읽어오려면:
    // currentSessionState = await redisJsonGet(getSessionKey(pin));
    // if (!currentSessionState) { /* ... 오류 처리 ... */ return; }

    if (currentSessionState.quizStarted) {
      logger.warn(
        `Attempted to start quiz for PIN: ${pin}, but quiz has already started. Ignoring duplicate request (lock acquired but state already set).`
      );
      // 이미 시작된 경우, 클라이언트에게 혼란을 주지 않기 위해 별도 메시지를 보내지 않거나,
      // "이미 시작됨" 상태를 명확히 전달할 수 있습니다. 여기서는 추가 메시지 없이 반환.
      return;
    }

    // Redis 세션 메타데이터 업데이트
    currentSessionState.currentQuestionIndex = 0; // 첫 번째 문제로 설정
    currentSessionState.isQuestionActive = true; // 질문 활성화 상태로 변경
    currentSessionState.quizStarted = true; // 퀴즈가 시작되었음을 표시
    currentSessionState.quizEndedByTeacher = false; // 교사가 아직 종료하지 않음

    if (questionContent && questionContent.length > 0) {
      currentSessionState.currentQuestionId = questionContent[0]._id
        ? questionContent[0]._id.toString()
        : null;
    } else {
      logger.error(
        `No questions found in questionContent for pin: ${pin} when starting quiz.`
      );
      ws.send(
        JSON.stringify({ type: "error", message: "No questions to start." })
      );
      return; // 락은 finally에서 해제됩니다.
    }

    const sessionMetadataKey = getSessionKey(pin);
    await redisJsonSet(sessionMetadataKey, currentSessionState); // 업데이트된 상태 Redis에 저장
    logger.info(
      `Session state updated in Redis for startQuiz (currentQuestionIndex: 0) for PIN: ${pin}`
    );

    const firstQuestion = questionContent[0];
    const readyMessage = {
      type: "quizStartingSoon",
      message: "퀴즈가 곧 시작됩니다",
      totalQuestions: questionContent.length,
    };

    ws.send(JSON.stringify(readyMessage));
    await broadcastToActiveStudents(pin, readyMessage);

    setTimeout(async () => {
      // setTimeout 콜백 내에서는 currentSessionState가 이전 상태일 수 있으므로,
      // 필요하다면 Redis에서 다시 읽어오거나, 주요 상태 변경은 setTimeout 바깥에서 완료해야 합니다.
      // 여기서는 endTime 계산 등은 즉시 실행되므로 큰 문제는 없을 수 있습니다.
      const currentTime = Date.now();
      const timeLimit = firstQuestion.timeLimit * 1000;
      const bufferTime = 2000;
      const endTime = currentTime + timeLimit + bufferTime;

      ws.send(
        JSON.stringify({
          type: "quizStarted",
          questionId: firstQuestion._id,
          currentQuestion: firstQuestion,
          questionNumber: 1,
          totalQuestions: questionContent.length,
          endTime: endTime,
        })
      );

      const questionOptions = firstQuestion.options.map((option) => ({
        text: option.text,
        imageUrl: option.imageUrl,
      }));
      await broadcastToActiveStudents(pin, {
        type: "newQuestionOptions",
        questionId: firstQuestion._id,
        options: questionOptions,
        endTime: endTime,
      });
      logger.info(`Quiz started for session PIN: ${pin}, first question sent.`);
    }, 3000);
  } catch (error) {
    logger.error(`Error in _handleStartQuiz for PIN ${pin}:`, error);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "퀴즈 시작 중 오류가 발생했습니다.",
        })
      );
    }
  } finally {
    if (lockAcquired) {
      await redisClient.del(lockKey);
    }
  }
}

// Helper function for 'nextQuestion' message
async function _handleNextQuestion(
  pin,
  ws,
  currentSessionState,
  questionContent
) {
  const currentQuestionIndex = currentSessionState.currentQuestionIndex;
  logger.info(
    `Handling nextQuestion for session PIN: ${pin}, current index from Redis: ${currentQuestionIndex}`
  );

  const lockKey = `lock:teacher:nextquestion:${pin}`;
  let lockAcquired = false;

  try {
    const result = await redisClient.set(lockKey, "locked", "EX", 5, "NX");
    lockAcquired = result === "OK";

    if (!lockAcquired) {
      logger.warn(
        `[NextQuestion] Could not acquire lock for PIN ${pin}. Next question action likely in progress.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message:
            "다음 질문 요청이 이미 처리 중입니다. 잠시 후 다시 시도해주세요.",
        })
      );
      return;
    }

    // 락 획득 후 최신 세션 상태를 다시 읽어오는 것을 고려할 수 있습니다.
    // currentSessionState = await redisJsonGet(getSessionKey(pin));
    // if (!currentSessionState) { /* ... 오류 처리 ... */ return; }
    // const currentQuestionIndex = currentSessionState.currentQuestionIndex; // 업데이트된 인덱스 사용

    if (currentSessionState.isQuestionActive) {
      logger.warn(
        `Attempted to move to next question for PIN: ${pin}, but current question (index: ${currentQuestionIndex}) is still active. Ignoring duplicate request (lock acquired but state already set).`
      );
      return;
    }

    const newQuestionIndex = currentSessionState.currentQuestionIndex + 1; // currentSessionState 직접 사용

    if (newQuestionIndex >= questionContent.length) {
      logger.info(
        `No more questions available to proceed to for session PIN: ${pin}. Current index: ${currentSessionState.currentQuestionIndex}, Total questions: ${questionContent.length}. Waiting for 'endQuiz'.`
      );
      ws.send(
        JSON.stringify({
          type: "info",
          message: "All questions have been presented. Please end the quiz.",
        })
      );
      return;
    }

    const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
    let studentIdsForUpdate = [];

    try {
      studentIdsForUpdate = await redisClient.sMembers(studentIdsSetKey);
    } catch (error) {
      logger.error(
        `Error fetching student IDs from Set for nextQuestion, PIN: ${pin}. Error:`,
        error
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message: "다음 질문 준비 중 오류가 발생했습니다 (참여자 ID 조회).",
        })
      );
      return;
    }

    if (studentIdsForUpdate.length > 0) {
      const updatePromises = studentIdsForUpdate.map(async (sid) => {
        const participantKey = getParticipantKey(pin, sid);
        // Optimistic update: Get and then set.
        // For higher concurrency, consider a Lua script or a different approach if this becomes a bottleneck.
        const participant = await redisJsonGet(participantKey);
        if (participant) {
          participant.hasSubmitted = false;
          await redisJsonSet(participantKey, participant, { EX: 3600 });
          return { studentId: sid, status: "success" };
        } else {
          // 참가자 데이터가 없는 경우, 오류로 처리하거나 경고 로깅.
          logger.warn(
            `Participant data not found for student ID: ${sid} during nextQuestion hasSubmitted reset for PIN: ${pin}.`
          );
          return { studentId: sid, status: "not_found" };
        }
      });

      const resultsSettled = await Promise.allSettled(updatePromises);
      let successCount = 0;
      resultsSettled.forEach((result, index) => {
        const sid = studentIdsForUpdate[index];
        if (
          result.status === "fulfilled" &&
          result.value.status === "success"
        ) {
          successCount++;
        } else if (
          result.status === "fulfilled" &&
          result.value.status === "not_found"
        ) {
          // 이미 위에서 경고 로깅됨
        } else {
          logger.error(
            `Failed to reset hasSubmitted for participant with student ID ${sid}, PIN: ${pin}. Reason:`,
            result.reason || result.value // result.value가 에러 객체일 수 있음
          );
        }
      });
      logger.info(
        `Participant 'hasSubmitted' reset attempt for session PIN: ${pin}. Total IDs: ${studentIdsForUpdate.length}, Successful: ${successCount}`
      );
    } else {
      logger.info(
        `No participants found (no student IDs in Set) to reset 'hasSubmitted' for session PIN: ${pin}`
      );
    }

    await redisClient.expire(getSessionQuestionsKey(pin), 3600); // 질문 스냅샷 TTL 갱신
    logger.info(
      `Questions snapshot expiration refreshed for session PIN: ${pin}`
    );

    // newQuestionIndex는 위에서 currentSessionState.currentQuestionIndex + 1 로 이미 계산됨
    if (newQuestionIndex < questionContent.length) {
      const nextQuestion = questionContent[newQuestionIndex];

      // Redis 세션 메타데이터 업데이트
      currentSessionState.currentQuestionIndex = newQuestionIndex;
      currentSessionState.isQuestionActive = true;
      currentSessionState.currentQuestionId = nextQuestion._id
        ? nextQuestion._id.toString()
        : null;

      const sessionMetadataKey = getSessionKey(pin);
      await redisJsonSet(sessionMetadataKey, currentSessionState); // 업데이트된 상태 Redis에 저장
      logger.info(
        `Session state updated in Redis for nextQuestion (idx: ${newQuestionIndex}) for PIN: ${pin}`
      );

      const isLastQuestion = newQuestionIndex === questionContent.length - 1;
      const readyMessage = {
        type: "preparingNextQuestion",
        message: isLastQuestion
          ? "마지막 문제입니다..."
          : "다음 문제가 곧 출제됩니다...",
        isLastQuestion: isLastQuestion,
      };
      ws.send(JSON.stringify(readyMessage));
      await broadcastToActiveStudents(pin, readyMessage);
      logger.info(
        `Sent 'preparingNextQuestion' for session PIN: ${pin}. Is last: ${isLastQuestion}`
      );

      setTimeout(async () => {
        const currentTime = Date.now();
        const timeLimit = nextQuestion.timeLimit * 1000;
        const bufferTime = 2000;
        const endTime = currentTime + timeLimit + bufferTime;
        ws.send(
          JSON.stringify({
            type: "newQuestion",
            questionId: nextQuestion._id,
            currentQuestion: nextQuestion,
            questionNumber: newQuestionIndex + 1,
            totalQuestions: questionContent.length,
            isLastQuestion: isLastQuestion,
            endTime: endTime,
          })
        );

        const questionOptions = nextQuestion.options.map((option) => ({
          text: option.text,
          imageUrl: option.imageUrl,
        }));
        await broadcastToActiveStudents(pin, {
          type: "newQuestionOptions",
          questionId: nextQuestion._id,
          endTime: endTime,
          options: questionOptions,
          isLastQuestion: isLastQuestion,
        });
        logger.info(
          `Sent 'newQuestion' and 'newQuestionOptions' for question index ${newQuestionIndex}, session PIN: ${pin}`
        );
      }, 3000);
    } else {
      // 이 경우는 이미 위에서 처리되었어야 함 (newQuestionIndex >= questionContent.length)
      logger.info(
        `All questions have been sent for session PIN: ${pin}. Waiting for 'endQuiz' message.`
      );
    }
  } catch (error) {
    logger.error(`Error in _handleNextQuestion for PIN ${pin}:`, error);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "다음 질문 진행 중 오류가 발생했습니다.",
        })
      );
    }
  } finally {
    if (lockAcquired) {
      await redisClient.del(lockKey);
    }
  }
}

// Helper function for 'endQuiz' message
async function _handleEndQuiz(pin, ws, currentSessionState, questionContent) {
  logger.info(`Handling endQuiz for session PIN: ${pin}`);

  const lockKey = `lock:teacher:endquiz:${pin}`;
  let lockAcquired = false;

  try {
    const result = await redisClient.set(lockKey, "locked", "EX", 10, "NX"); // 정리 작업이 있을 수 있으므로 조금 더 긴 타임아웃 (20초)
    lockAcquired = result === "OK";

    if (!lockAcquired) {
      logger.warn(
        `[EndQuiz] Could not acquire lock for PIN ${pin}. End quiz action likely in progress.`
      );
      // 이미 종료 중이거나 종료된 상태일 수 있으므로, 사용자에게 오류보다는 상태 메시지를 전달하는 것이 나을 수 있음
      ws.send(
        JSON.stringify({
          type: "info", // 또는 error
          message: "퀴즈 종료 요청이 이미 처리 중이거나 완료되었습니다.",
        })
      );
      return;
    }

    // 락 획득 후 최신 세션 상태를 다시 읽어오는 것을 고려합니다.
    // 특히 quizEndedByTeacher 상태를 확인하기 위해.
    const freshSessionState = await redisJsonGet(getSessionKey(pin));
    if (!freshSessionState) {
      logger.error(
        `[EndQuiz] Critical: Session state not found in Redis for PIN: ${pin} after acquiring lock. Aborting.`
      );
      // ws.send(...); // 오류 메시지 전송
      return;
    }
    // currentSessionState 대신 freshSessionState 사용
    if (freshSessionState.quizEndedByTeacher) {
      logger.warn(
        `[EndQuiz] Quiz for PIN: ${pin} was already marked as ended by teacher. Ignoring duplicate request.`
      );
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "info",
            message: "퀴즈가 이미 종료되었습니다.",
          })
        );
      }
      return;
    }

    // 1. Redis 세션 메타데이터에 교사가 종료했음을 표시
    freshSessionState.quizEndedByTeacher = true; // 교사가 명시적으로 퀴즈를 종료했음을 Redis에 기록
    freshSessionState.isQuestionActive = false; // 더 이상 질문이 활성 상태가 아님
    await redisJsonSet(getSessionKey(pin), freshSessionState);
    logger.info(
      `Session state updated in Redis: quizEndedByTeacher=true for PIN: ${pin}`
    );

    // 2. 퀴즈 결과 저장 (MongoDB의 KahootQuizSession은 업데이트하지 않음)
    const resultsSaved = await _saveQuizResults(
      pin,
      freshSessionState, // 업데이트된 freshSessionState 사용
      questionContent,
      false // false: forUnexpectedClose 아님
    );

    if (resultsSaved) {
      logger.info(
        `Quiz results successfully saved for session PIN: ${pin} via normal endQuiz.`
      );
    } else {
      logger.warn(
        `Quiz results might not have been saved or no results to save for PIN: ${pin} via normal endQuiz.`
      );
    }

    // 3. 교사에게 알림
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "sessionEnded",
          message: "퀴즈가 성공적으로 종료되었습니다. 결과가 저장되었습니다.",
        })
      );
      logger.info(`Sent sessionEnded to teacher for session ${pin}.`);
    }

    // 4. 세션 리소스 정리 (Redis 데이터 등. KahootQuizSession DB 문서는 보존됨)
    // _cleanupSessionResources는 내부적으로 학생들에게 알림을 보낼 수 있으므로, 교사에게 sessionEnded 메시지 발송 후에 호출.
    await _cleanupSessionResources(pin, ws, {
      notifyStudents: true,
      closeStudentSockets: true,
      closeTeacherSocket: true, // 명시적으로 교사 소켓을 닫도록 요청 (락이 해제된 후 실제 닫힘)
    });
    logger.info(
      `Session ${pin} ended by teacher. Resources cleaned up. KahootQuizSession in DB preserved.`
    );
  } catch (error) {
    logger.error(`Error during quiz session end for PIN ${pin}:`, error);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          error: "퀴즈 종료 중 오류가 발생했습니다.",
        })
      );
    }
  } finally {
    if (lockAcquired) {
      await redisClient.del(lockKey);
    }
  }
}

// 새로운 헬퍼 함수: 교사 연결 종료 시 자동 결과 저장 처리
// 교사 웹소켓 연결이 예기치 않게 종료되었을 때, 특정 조건 만족 시 퀴즈 결과를 자동으로 저장합니다.
async function _handleAutoSaveOnTeacherDisconnect(
  pin,
  currentSessionOnClose,
  questionContent,
  sessionMetadataKey
) {
  if (currentSessionOnClose && questionContent && questionContent.length > 0) {
    // 자동 저장 조건:
    const quizWasStarted = currentSessionOnClose.quizStarted === true; // 1. 퀴즈가 한 번이라도 시작되었어야 함
    const allQuestionsWerePresented =
      currentSessionOnClose.currentQuestionIndex >= // 2. 모든 문제가 한 번 이상 출제되었어야 함
      questionContent.length - 1;
    const quizNotExplicitlyEndedByTeacher =
      currentSessionOnClose.quizEndedByTeacher !== true; // 3. 교사가 명시적으로 퀴즈를 종료하지 않았어야 함

    if (
      quizWasStarted &&
      allQuestionsWerePresented &&
      quizNotExplicitlyEndedByTeacher
    ) {
      logger.info(
        `Teacher WebSocket for PIN ${pin} closed. Conditions met for auto-saving results (started, all presented, not explicitly ended by teacher).`
      );
      try {
        const resultsSaved = await _saveQuizResults(
          pin,
          currentSessionOnClose,
          questionContent,
          true // forUnexpectedClose = true
        );
        if (resultsSaved) {
          logger.info(
            `Results saved for PIN ${pin} due to unexpected teacher disconnect.`
          );
        } else {
          logger.warn(
            `Results not saved or no results to save for PIN ${pin} on unexpected disconnect.`
          );
        }
      } catch (error) {
        logger.error(
          `Error attempting to save results on teacher disconnect for PIN ${pin}:`,
          error
        );
      }
    } else {
      logger.info(
        `Teacher WebSocket closed for PIN ${pin}. Conditions for auto-saving results NOT met (started: ${quizWasStarted}, allPresented: ${allQuestionsWerePresented}, notExplicitlyEnded: ${quizNotExplicitlyEndedByTeacher}). Session metadata from Redis key: ${sessionMetadataKey}`
      );
    }
  } else {
    logger.warn(
      `Cannot determine if results should be saved for PIN ${pin} on close; session data from Redis (key: ${sessionMetadataKey}) or question content missing.`
    );
  }
}

// Helper function for 'viewDetailedResults' message
async function _handleViewDetailedResults(
  pin,
  ws,
  currentSessionState,
  questionContent
) {
  logger.info(`Handling viewDetailedResults for session PIN: ${pin}`);

  // 1. 학생 연결 종료
  if (kahootClients[pin] && kahootClients[pin].students) {
    logger.info(
      `[ViewResults] Closing student WebSockets for PIN: ${pin} as teacher is viewing detailed results.`
    );
    Object.values(kahootClients[pin].students).forEach((studentWs) => {
      if (studentWs.readyState === WebSocket.OPEN) {
        try {
          studentWs.send(
            JSON.stringify({
              type: "sessionClosedByTeacher",
              message:
                "The teacher is viewing detailed results. The session is concluding.",
            })
          );
          studentWs.close(1000, "Teacher viewing detailed results"); // 정상 종료 코드
        } catch (e) {
          logger.warn(
            `[ViewResults] Error sending close message or closing student WebSocket for PIN ${pin}: ${e.message}. Terminating.`
          );
          studentWs.terminate(); // 강제 종료
        }
      }
    });
    // 학생 목록을 로컬에서 즉시 비우는 것보다, 각 소켓의 'close' 이벤트 핸들러가
    // kahootClients[pin].students에서 개별 학생을 제거하고,
    // 필요한 경우 unsubscribeFromPinChannels를 트리거하도록 두는 것이 더 견고할 수 있습니다.
  }

  // 2. 필요한 데이터 가져오기 (참여자 정보)
  const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
  let studentIdsForResults = [];
  try {
    studentIdsForResults = await redisClient.sMembers(studentIdsSetKey);
  } catch (error) {
    logger.error(
      `Error fetching student IDs from Set for detailed results, PIN: ${pin}. Error:`,
      error
    );
    ws.send(
      JSON.stringify({
        type: "error",
        message:
          "상세 결과를 가져오는 중 오류가 발생했습니다 (참여자 ID 조회).",
      })
    );
    return;
  }

  if (studentIdsForResults.length === 0) {
    logger.info(`No participants found for detailed results, PIN: ${pin}.`);
    // 학생이 없더라도, 퀴즈 기본 정보와 빈 결과 구조를 보낼 수 있습니다.
    // 여기서는 일단 빈 결과로 처리하고, 프론트엔드에서 "참여자가 없습니다" 등으로 표시하도록 합니다.
    ws.send(
      JSON.stringify({
        type: "detailedResults",
        payload: {
          overallRanking: [],
          questionDetails: [],
          quizSummary: {
            totalParticipants: 0,
            averageScore: 0,
            mostDifficultQuestions: [],
            easiestQuestions: [],
          },
          quizMetadata: {
            // 퀴즈 기본 정보 추가
            title: currentSessionState.quizTitle || "퀴즈 제목 없음", // 세션 생성 시 KahootQuizContent의 title을 저장했다면 사용
            totalQuestions: questionContent ? questionContent.length : 0,
          },
        },
      })
    );
    return;
  }

  const participantKeys = studentIdsForResults.map((sid) =>
    getParticipantKey(pin, sid)
  );
  const participantsDataArray = await redisJsonMGet(participantKeys);
  const validParticipants = participantsDataArray
    .filter((p) => p)
    .map((p) => ({
      studentId: p.student,
      name: p.name,
      score: p.score || 0,
      responses: p.responses || [],
      character: p.character, // 캐릭터 정보가 있다면 포함
    }));

  if (validParticipants.length === 0) {
    logger.info(
      `No valid participant data found after MGET for detailed results, PIN: ${pin}.`
    );
    ws.send(
      JSON.stringify({
        type: "detailedResults",
        payload: {
          /* ... 빈 구조 ... */
        },
      })
    );
    return;
  }

  // 3. 데이터 분석 및 가공
  const overallRanking = [...validParticipants]
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({ ...p, rank: index + 1 }));

  const questionDetails = [];
  if (questionContent && questionContent.length > 0) {
    for (const question of questionContent) {
      const questionIdStr = question._id.toString();
      let correctAttempts = 0;
      let totalAttempts = 0;
      const optionCounts = Array(question.options.length).fill(0);

      for (const participant of validParticipants) {
        const response = participant.responses.find(
          (r) => r.question && r.question.toString() === questionIdStr
        );
        if (response) {
          totalAttempts++;
          if (response.isCorrect) {
            correctAttempts++;
          }
          if (
            response.answer !== null &&
            response.answer >= 0 &&
            response.answer < optionCounts.length
          ) {
            optionCounts[response.answer]++;
          }
        }
      }

      const correctAnswerRate =
        totalAttempts > 0 ? correctAttempts / totalAttempts : 0;
      const optionDistribution = optionCounts.map((count, index) => ({
        optionIndex: index,
        text: question.options[index]
          ? question.options[index].text
          : `옵션 ${index + 1}`, // 옵션 텍스트 추가
        imageUrl: question.options[index]
          ? question.options[index].imageUrl
          : null, // 옵션 이미지 URL 추가
        count,
        percentage: totalAttempts > 0 ? count / totalAttempts : 0,
      }));

      questionDetails.push({
        questionId: questionIdStr,
        questionText: question.questionText,
        questionType: question.questionType,
        imageUrl: question.imageUrl,
        options: question.options.map((opt) => ({
          text: opt.text,
          imageUrl: opt.imageUrl,
        })), // 간략한 옵션 정보
        correctAnswer: question.correctAnswer, // 정답 인덱스 또는 내용
        correctAnswerRate,
        totalAttempts,
        optionDistribution,
      });
    }
  }

  const sortedByDifficulty = [...questionDetails].sort(
    (a, b) => a.correctAnswerRate - b.correctAnswerRate
  );
  const mostDifficultQuestions = sortedByDifficulty
    .slice(0, Math.min(3, sortedByDifficulty.length))
    .map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      correctAnswerRate: q.correctAnswerRate,
    }));
  const easiestQuestions = sortedByDifficulty
    .slice(Math.max(0, sortedByDifficulty.length - 3))
    .reverse()
    .map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      correctAnswerRate: q.correctAnswerRate,
    }));

  const totalScoreSum = validParticipants.reduce((sum, p) => sum + p.score, 0);
  const averageScore =
    validParticipants.length > 0 ? totalScoreSum / validParticipants.length : 0;

  const quizSummary = {
    totalParticipants: validParticipants.length,
    averageScore: parseFloat(averageScore.toFixed(2)),
    mostDifficultQuestions,
    easiestQuestions,
  };

  const quizMetadata = {
    title:
      currentSessionState.quizTitle ||
      (questionContent && questionContent.length > 0
        ? "퀴즈"
        : "퀴즈 제목 없음"), // KahootQuizContent에서 가져온 title
    totalQuestions: questionContent ? questionContent.length : 0,
    grade: currentSessionState.grade,
    subject: currentSessionState.subject,
    semester: currentSessionState.semester,
    unit: currentSessionState.unit,
  };

  // 4. 교사에게 결과 전송
  const detailedResultsPayload = {
    overallRanking,
    questionDetails,
    quizSummary,
    quizMetadata, // 퀴즈 메타데이터 추가
  };

  ws.send(
    JSON.stringify({
      type: "detailedResults",
      payload: detailedResultsPayload,
    })
  );

  logger.info(
    `Sent detailedResults to teacher for session PIN: ${pin}. Processed ${validParticipants.length} participants.`
  );
}

exports.handleTeacherWebSocketConnection = async (ws, teacherId, pin) => {
  // kahootClients 초기화 시 subscribedChannels Set도 준비
  if (!kahootClients[pin]) {
    kahootClients[pin] = {
      teacher: null,
      students: {},
      subscribedChannels: new Set(), // Set 초기화
    };
  }
  // 교사 웹소켓은 하나만 존재한다고 가정, students 객체는 학생 핸들러에서 관리
  if (!kahootClients[pin].subscribedChannels) {
    // 방어 코드
    kahootClients[pin].subscribedChannels = new Set();
  }

  kahootClients[pin].teacher = ws;
  logger.info(
    `Teacher ${teacherId} connected to session: ${pin}. Local clients for pin: ${
      Object.keys(kahootClients[pin].students || {}).length
    } students, teacher: ${!!kahootClients[pin].teacher}.`
  );

  setupKeepAlive(ws, pin, "Teacher");

  // --- BEGIN MODIFICATION: PIN 채널 구독 ---
  try {
    await subscribeToPinChannels(pin); // 해당 PIN의 채널들 구독 시도
  } catch (subError) {
    logger.error(
      `[ConnectTeacher] Error subscribing to PIN channels for ${pin}, teacher ${teacherId}:`,
      subError
    );
    // 구독 실패 시 교사 연결 처리 방안 결정 필요 (예: 연결 종료)
    // ws.send(JSON.stringify({ type: "error", message: "Subscription error. Please try again." }));
    // ws.close(); // ws.on('close')가 호출되면서 unsubscribe 시도됨
    // return;
  }
  // --- END MODIFICATION: PIN 채널 구독 ---

  const sessionMetadataKey = getSessionKey(pin);
  let sessionFromRedis = await redisJsonGet(sessionMetadataKey);

  if (!sessionFromRedis) {
    logger.error(
      `Session metadata not found in Redis for pin: ${pin} on teacher connect.`
    );
    ws.send(JSON.stringify({ error: "Session data not found, cannot start." }));
    ws.close(); // ws.on('close')가 호출되면서 unsubscribe 시도됨
    return;
  }

  const sessionQuestionsKey = getSessionQuestionsKey(pin);
  let questionContent = await redisJsonGet(sessionQuestionsKey);

  if (!questionContent) {
    logger.warn(
      `Questions snapshot not found in Redis for pin: ${pin}. Attempting to load from DB.`
    );
    if (sessionFromRedis.sessionId) {
      const dbSession = await KahootQuizSession.findById(
        sessionFromRedis.sessionId
      ).select("questionsSnapshot");
      if (dbSession && dbSession.questionsSnapshot) {
        questionContent = dbSession.questionsSnapshot.map((q) => q.toObject());
        await redisJsonSet(sessionQuestionsKey, questionContent, { EX: 3600 });
        logger.info(
          `Questions snapshot for pin ${pin} loaded from DB (KahootQuizSession) and cached in Redis.`
        );
      } else {
        logger.error(
          `Failed to load questions snapshot from DB (KahootQuizSession) for session ID: ${sessionFromRedis.sessionId} (pin: ${pin}).`
        );
        ws.send(
          JSON.stringify({
            error: "Quiz questions not found for this session.",
          })
        );
        ws.close();
        return;
      }
    } else {
      logger.error(
        `Cannot load questions from DB as MongoDB sessionId is missing in Redis metadata for pin: ${pin}.`
      );
      ws.send(JSON.stringify({ error: "Session configuration error." }));
      ws.close();
      return;
    }
  }

  ws.on("close", async () => {
    logger.info(
      `Teacher WebSocket for pin ${pin} (teacherId: ${teacherId}) closed.`
    );

    if (ws.isGracefulShutdown) {
      logger.info(
        `[CloseTeacher] Graceful shutdown for PIN ${pin}. Cleanup already handled by _handleEndQuiz.`
      );
      if (kahootClients[pin]) {
        kahootClients[pin].teacher = null;
      }
      return;
    }

    if (kahootClients[pin]) {
      kahootClients[pin].teacher = null;
      logger.info(
        `Teacher ${teacherId} removed from local kahootClients for PIN ${pin} (unexpected close).`
      );
    }

    const currentSessionOnClose = await redisJsonGet(sessionMetadataKey);
    if (currentSessionOnClose && questionContent) {
      await _handleAutoSaveOnTeacherDisconnect(
        pin,
        currentSessionOnClose,
        questionContent,
        sessionMetadataKey
      );
    } else {
      logger.warn(
        `[CloseTeacher] Cannot attempt auto-save for PIN ${pin} due to missing session or question data.`
      );
    }

    logger.info(
      `[CloseTeacher] Unexpected close for PIN ${pin}. Proceeding with full cleanup and explicit unsubscribe check.`
    );
    await _cleanupSessionResources(pin, ws, {
      notifyStudents: false,
      closeStudentSockets: true,
      closeTeacherSocket: false,
    });

    try {
      logger.info(
        `[CloseTeacher-ExplicitUnsub] Attempting to unsubscribe channels for PIN ${pin} after teacher disconnect.`
      );
      await unsubscribeFromPinChannels(pin);
    } catch (unsubError) {
      logger.error(
        `[CloseTeacher-ExplicitUnsub] Error during explicit unsubscribeFromPinChannels for PIN ${pin} after teacher disconnect:`,
        unsubError
      );
    }

    if (!kahootClients[pin]) {
      logger.info(
        `[CloseTeacher] kahootClients[${pin}] was deleted by cleanup/unsubscribe. This instance no longer manages PIN ${pin}.`
      );
    }
  });

  ws.on("error", async (error) => {
    logger.error(
      `Error occurred on teacher connection for pin ${pin} (teacherId: ${teacherId}): ${error}`
    );
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.terminate();
    }
  });

  ws.on("message", async (message) => {
    const parsedMessage = JSON.parse(message);
    let currentSessionState = await redisJsonGet(sessionMetadataKey);

    if (!currentSessionState) {
      logger.error(
        `Session ${pin} metadata not found in Redis during message processing. Aborting.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Session data lost. Please restart.",
        })
      );
      return;
    }

    switch (parsedMessage.type) {
      case "startQuiz":
        await _handleStartQuiz(pin, ws, currentSessionState, questionContent);
        break;
      case "nextQuestion":
        await _handleNextQuestion(
          pin,
          ws,
          currentSessionState,
          questionContent
        );
        break;
      case "endQuiz":
        await _handleEndQuiz(pin, ws, currentSessionState, questionContent);
        break;
      case "viewDetailedResults":
        await _handleViewDetailedResults(
          pin,
          ws,
          currentSessionState,
          questionContent
        );
        break;
      default:
        logger.warn(
          `Unknown message type received from teacher for pin ${pin}: ${parsedMessage.type}`
        );
    }
  });
};
