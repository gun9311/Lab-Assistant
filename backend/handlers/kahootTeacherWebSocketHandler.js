// 교사 웹소켓 핸들러
const KahootQuizSession = require("../models/KahootQuizSession");
const QuizResult = require("../models/QuizResult");
const { redisClient } = require("../utils/redisClient");
const logger = require("../utils/logger");
const WebSocket = require("ws");
const {
  kahootClients,
  broadcastToTeacher,
  broadcastToStudents,
  broadcastToActiveStudents,
  setupKeepAlive,
  subscribeToPinChannels,
  unsubscribeFromPinChannels,
  getActiveStudentCount,
  publishIndividualFeedbackList,
  // handleAllSubmissionsProcessing,
} = require("./kahootShared");
const {
  getSessionKey,
  getSessionQuestionsKey,
  getSessionStudentIdsSetKey,
  getParticipantKey,
  getSessionTakenCharactersSetKey,
  getRedisChannelForceCloseStudents,
  getTeacherViewingResultsFlagKey,
  getRedisChannelBroadcastToActiveStudents,
} = require("../utils/redisKeys");
const {
  redisJsonGet,
  redisJsonSet,
  redisJsonMGet,
} = require("../utils/redisUtils");

// 새로운 헬퍼 함수: 7초 전 알림 타이머 설정
async function _set7SecondWarningTimer(pin, endTime) {
  if (!kahootClients[pin]) {
    logger.warn(
      `[Timer] Attempted to set 7-second warning for PIN ${pin}, but kahootClients[${pin}] does not exist.`
    );
    return;
  }

  // Clear any existing timer first
  if (kahootClients[pin].timeLeftTimeoutId) {
    clearTimeout(kahootClients[pin].timeLeftTimeoutId);
  }

  const sevenSecondsWarningTime = endTime - 7000;
  const delay = sevenSecondsWarningTime - Date.now();

  if (delay > 0) {
    kahootClients[pin].timeLeftTimeoutId = setTimeout(async () => {
      try {
        const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
        const allStudentIdsInSession = await redisClient.sMembers(
          studentIdsSetKey
        );
        const unsubmittedStudentIds = [];

        if (allStudentIdsInSession && allStudentIdsInSession.length > 0) {
          const participantKeys = allStudentIdsInSession.map((sid) =>
            getParticipantKey(pin, sid)
          );
          const participants = await redisJsonMGet(participantKeys);

          if (participants) {
            participants.forEach((p) => {
              if (
                p &&
                p.status === "connected_participating" &&
                !p.hasSubmitted
              ) {
                unsubmittedStudentIds.push(p.student);
              }
            });
          }
        }

        if (unsubmittedStudentIds.length > 0) {
          await broadcastToActiveStudents(
            pin,
            { type: "timeLeft", seconds: 7 },
            unsubmittedStudentIds
          );
          logger.info(
            `[Timer] Triggered '7 seconds left' notification for ${unsubmittedStudentIds.length} unsubmitted students for PIN: ${pin}`
          );
        }
      } catch (error) {
        logger.error(
          `[Timer] Error inside 7-second warning timeout for PIN ${pin}:`,
          error
        );
      }
    }, delay);

    logger.info(
      `[Timer] Set '7 seconds left' notification for PIN: ${pin} to trigger in ${delay}ms.`
    );
  }
}

async function handleAllSubmissionsProcessing(
  pin,
  session, // 이 session 인자는 _checkAndFinalizeCurrentQuestionIfNeeded 에서 전달된 상태일 수 있음
  currentQuestion,
  allParticipants
) {
  // 타이머 해제 로직이 여기 있었다면 제거합니다.

  const latestSessionState = await redisJsonGet(getSessionKey(pin));

  if (!latestSessionState) {
    logger.error(
      `[HASP] Critical: Session state not found in Redis for PIN: ${pin} at the beginning of handleAllSubmissionsProcessing. Aborting.`
    );
    return;
  }

  if (!latestSessionState.isQuestionActive) {
    logger.warn(
      `[HASP] Question for PIN: ${pin} (ID: ${currentQuestion?._id}) is no longer active. Likely already processed by another call. Aborting duplicate call to handleAllSubmissionsProcessing.`
    );
    return;
  }

  // 즉시 isQuestionActive를 false로 설정하고 Redis에 반영
  latestSessionState.isQuestionActive = false;
  try {
    await redisJsonSet(getSessionKey(pin), latestSessionState, { EX: 3600 });
    logger.info(
      `[HASP] Successfully set isQuestionActive=false in Redis for PIN: ${pin}, Question ID: ${currentQuestion?._id}. Proceeding with feedback and other processing.`
    );
  } catch (error) {
    logger.error(
      `[HASP] Failed to update session state (isQuestionActive=false) in Redis for PIN: ${pin}. Aborting processing to prevent inconsistencies. Error:`,
      error
    );
    // isQuestionActive를 false로 설정하는데 실패하면, 다른 호출이 시도할 수 있도록 여기서 중단
    return;
  }

  logger.info(
    `[HASP] Processing all submissions for PIN: ${pin}, Question ID: ${
      currentQuestion?._id
    }. Participants: ${
      allParticipants.length
    }. Session state (after update): ${JSON.stringify(latestSessionState)}`
  );

  // 학생별 피드백 페이로드 목록 생성
  const feedbackListForPublishing = [];
  const participantUpdatePromises = allParticipants.map(async (p) => {
    const response = p.responses.find(
      (r) => r.question.toString() === currentQuestion._id.toString()
    );

    let teamForScore = null;
    if (latestSessionState.isTeamMode && latestSessionState.teams) {
      const team = latestSessionState.teams.find((t) =>
        t.members.includes(p.student)
      );
      if (team) {
        teamForScore = team.teamScore;
      }
    }

    feedbackListForPublishing.push({
      studentId: p.student,
      feedbackPayload: {
        type: "feedback",
        correct: response ? response.isCorrect : false,
        score: p.score,
        teamScore: latestSessionState.isTeamMode ? teamForScore : null,
      },
    });

    p.hasSubmitted = false;
    return redisJsonSet(getParticipantKey(pin, p.student), p, { EX: 3600 });
  });

  await Promise.all(participantUpdatePromises); // 참여자 상태 업데이트 완료 대기

  // 생성된 피드백 목록을 Pub/Sub으로 발행
  if (feedbackListForPublishing.length > 0) {
    await publishIndividualFeedbackList(pin, feedbackListForPublishing);
  }

  // 교사에게는 모든 학생이 제출했다는 정보와 요약된 랭킹 등을 보냄 (이 로직은 유지)
  await broadcastToTeacher(pin, {
    type: "allStudentsSubmitted",
    feedback: allParticipants
      .sort((a, b) => b.score - a.score)
      .map((p, index) => {
        const currentQuestionResponse = p.responses.find(
          (r) => r.question.toString() === currentQuestion._id.toString()
        );
        return {
          studentId: p.student,
          name: p.name,
          score: p.score,
          isCorrect: currentQuestionResponse
            ? currentQuestionResponse.isCorrect
            : false,
          rank: index + 1,
        };
      }),
  });

  // Process waiting list (이제 'connected_waiting' 상태의 학생들을 활성화)
  const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
  let studentsToActivate = [];

  try {
    const allStudentIdsInSession = await redisClient.sMembers(studentIdsSetKey);

    if (allStudentIdsInSession.length === 0) {
      logger.info(
        `No student IDs found in Set for waiting list processing, PIN: ${pin}.`
      );
    } else {
      const participantKeys = allStudentIdsInSession.map((sid) =>
        getParticipantKey(pin, sid)
      );
      const participantDataArray = await redisJsonMGet(participantKeys); // MGET 사용

      if (participantDataArray) {
        participantDataArray.forEach((participantData, index) => {
          if (participantData) {
            if (participantData.status === "connected_waiting") {
              studentsToActivate.push(participantData);
            }
          } else {
            // participantData가 null인 경우 (키가 없거나 파싱 실패)
            logger.warn(
              `Participant data for studentId ${allStudentIdsInSession[index]} was null or invalid during waiting list processing (MGET), PIN: ${pin}.`
            );
          }
        });
      } else {
        logger.error(
          `Failed to get participant data array via MGET for waiting list processing, PIN: ${pin}.`
        );
      }
    }
  } catch (error) {
    logger.error(
      `Error fetching student IDs from Set or MGET participant data for waiting list processing, PIN: ${pin}. Error:`,
      error
    );
  }

  logger.info(
    `Found ${studentsToActivate.length} students to activate from waiting list for PIN: ${pin}.`
  );

  for (const participantToActivate of studentsToActivate) {
    participantToActivate.status = "connected_participating"; // '참여 중' 상태로 변경
    participantToActivate.hasSubmitted = false; // 다음 문제부터 참여하므로 초기화
    await redisJsonSet(
      getParticipantKey(pin, participantToActivate.student),
      participantToActivate,
      { EX: 3600 }
    );

    // 이미 Student.findById는 최초 참여 시(_handleCharacterSelected)에 수행되었으므로,
    // participantToActivate 객체에 name과 character 정보가 있어야 함.
    await broadcastToTeacher(pin, {
      type: "studentJoined", // 또는 "studentActivated"
      studentId: participantToActivate.student,
      name: participantToActivate.name, // Ensure name is available
      character: participantToActivate.character, // Ensure character is available
      isReady: true, // 이제 참여 준비 완료
    });
    logger.info(
      `Activated student ${participantToActivate.student} in session ${pin}. Now participating.`
    );
  }
}

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

  // --- 5초 전 알림 타이머 정리 (안전장치) ---
  if (kahootClients[pin] && kahootClients[pin].timeLeftTimeoutId) {
    clearTimeout(kahootClients[pin].timeLeftTimeoutId);
    kahootClients[pin].timeLeftTimeoutId = null;
    logger.info(
      `Cleared 'timeLeft' timeout for PIN: ${pin} during session resource cleanup.`
    );
  }
  // ---

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

// 새로운 헬퍼 함수: 시간 종료로 인한 문제 마감 처리
async function _handleTimeUp(pin) {
  logger.info(`Handling timeUp for session PIN: ${pin}`);

  // --- 5초 전 알림 타이머 정리 ---
  if (kahootClients[pin] && kahootClients[pin].timeLeftTimeoutId) {
    clearTimeout(kahootClients[pin].timeLeftTimeoutId);
    kahootClients[pin].timeLeftTimeoutId = null;
    logger.info(
      `[TimeUp] Cleared 'timeLeft' timeout for PIN: ${pin} because time is up.`
    );
  }
  // ---

  const lockKey = `lock:teacher:timeup:${pin}`;
  let lockAcquired = false;

  try {
    lockAcquired = await redisClient.set(lockKey, "locked", "EX", 5, "NX");
    if (!lockAcquired) {
      logger.warn(
        `[TimeUp] Could not acquire lock for PIN ${pin}. TimeUp already being processed.`
      );
      return;
    }

    const sessionState = await redisJsonGet(getSessionKey(pin));
    // 이 시점에서 마감 신호를 보낸 교사가 유효한지 확인할 수도 있습니다.
    // 예를 들어, ws 객체를 전달받아 준비 상태인지 확인합니다.

    if (!sessionState || !sessionState.isQuestionActive) {
      logger.warn(
        `[TimeUp] Received timeUp for PIN ${pin}, but question is no longer active. Ignoring.`
      );
      return;
    }

    const questions = await redisJsonGet(getSessionQuestionsKey(pin));
    if (!questions) {
      logger.error(`[TimeUp] Questions not found for PIN: ${pin}`);
      return;
    }
    const currentQuestion = questions.find(
      (q) => q._id.toString() === sessionState.currentQuestionId.toString()
    );
    if (!currentQuestion) {
      logger.error(`[TimeUp] Current question not found for PIN: ${pin}`);
      return;
    }

    const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
    const studentIds = await redisClient.sMembers(studentIdsSetKey);
    let allValidPData = [];

    if (studentIds && studentIds.length > 0) {
      const participantKeys = studentIds.map((sid) =>
        getParticipantKey(pin, sid)
      );
      const pDataArray = await redisJsonMGet(participantKeys);
      if (pDataArray) {
        allValidPData = pDataArray.filter((p) => p);
      }
    }

    const activeParticipants = allValidPData.filter(
      (p) => p && p.status === "connected_participating"
    );

    // 공용 마감 처리 함수 호출
    await handleAllSubmissionsProcessing(
      pin,
      sessionState,
      currentQuestion,
      activeParticipants
    );

    logger.info(`[TimeUp] Successfully processed timeUp for PIN: ${pin}`);
  } catch (error) {
    logger.error(`Error in _handleTimeUp for PIN ${pin}:`, error);
  } finally {
    if (lockAcquired) {
      await redisClient.del(lockKey);
    }
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
      const activeStudentCount = await getActiveStudentCount(pin);

      // --- 7초 전 알림 타이머 설정 ---
      await _set7SecondWarningTimer(pin, endTime);
      // ---

      // 질문 시작 시간을 Redis에 기록
      const sessionStateForTimestamp = await redisJsonGet(getSessionKey(pin));
      if (sessionStateForTimestamp) {
        sessionStateForTimestamp.questionStartTime = Date.now();
        await redisJsonSet(
          getSessionKey(pin),
          sessionStateForTimestamp,
          { EX: 3600 } // TTL 1시간으로 재설정
        );
      }

      ws.send(
        JSON.stringify({
          type: "quizStarted",
          questionId: firstQuestion._id,
          currentQuestion: firstQuestion,
          questionNumber: 1,
          totalQuestions: questionContent.length,
          endTime: endTime,
          activeStudentCount: activeStudentCount,
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
        timeLimit: firstQuestion.timeLimit,
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

    // 락 획득 후 최신 세션 상태를 다시 읽어오는 것을 고려합니다.
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
        const activeStudentCount = await getActiveStudentCount(pin);

        // --- 7초 전 알림 타이머 설정 ---
        await _set7SecondWarningTimer(pin, endTime);
        // ---

        // 질문 시작 시간을 Redis에 기록
        const sessionStateForTimestamp = await redisJsonGet(getSessionKey(pin));
        if (sessionStateForTimestamp) {
          sessionStateForTimestamp.questionStartTime = Date.now();
          await redisJsonSet(
            getSessionKey(pin),
            sessionStateForTimestamp,
            { EX: 3600 } // TTL 1시간으로 재설정
          );
        }

        ws.send(
          JSON.stringify({
            type: "newQuestion",
            questionId: nextQuestion._id,
            currentQuestion: nextQuestion,
            questionNumber: newQuestionIndex + 1,
            totalQuestions: questionContent.length,
            isLastQuestion: isLastQuestion,
            endTime: endTime,
            activeStudentCount: activeStudentCount,
          })
        );

        const questionOptions = nextQuestion.options.map((option) => ({
          text: option.text,
          imageUrl: option.imageUrl,
        }));
        await broadcastToActiveStudents(pin, {
          type: "newQuestionOptions",
          questionId: nextQuestion._id,
          options: questionOptions,
          isLastQuestion: isLastQuestion,
          timeLimit: nextQuestion.timeLimit,
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

  // --- 5초 전 알림 타이머 정리 ---
  if (kahootClients[pin] && kahootClients[pin].timeLeftTimeoutId) {
    clearTimeout(kahootClients[pin].timeLeftTimeoutId);
    kahootClients[pin].timeLeftTimeoutId = null;
    logger.info(
      `[EndQuiz] Cleared 'timeLeft' timeout for PIN: ${pin} because quiz is ending.`
    );
  }
  // ---

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
      closeTeacherSocket: false,
    });
    logger.info(
      `Session ${pin} ended by teacher. Resources cleaned up. KahootQuizSession in DB preserved.`
    );

    // 퀴즈 종료 처리 중이므로, '교사 결과 보기 중' 플래그가 있다면 삭제
    const teacherViewingResultsFlag = getTeacherViewingResultsFlagKey(pin);
    await redisClient.del(teacherViewingResultsFlag);
    logger.info(
      `[EndQuiz] Cleared teacher_viewing_results flag for PIN: ${pin} (if existed).`
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
  const teacherViewingResultsFlag = getTeacherViewingResultsFlagKey(pin);

  try {
    // 1. 교사가 상세 결과 보기 시작했음을 Redis에 플래그로 표시
    // 이 플래그는 학생 연결 종료 로직에서 noStudentsRemaining 알림을 보내지 않도록 하는 데 사용됩니다.
    // TTL을 짧게 (예: 5-10분) 설정하여, 만약의 경우에도 자동으로 삭제되도록 합니다.
    await redisClient.set(teacherViewingResultsFlag, "true", "EX", 600); // 10분 TTL
    logger.info(
      `[ViewResults] Set teacher_viewing_results flag for PIN: ${pin}`
    );

    // 2. Pub/Sub을 통해 모든 인스턴스의 학생들에게 연결 종료 요청 발행
    const forceCloseChannel = getRedisChannelForceCloseStudents(pin);
    const forceClosePayload = {
      notification:
        "교사가 상세 결과를 확인하여 세션이 종료됩니다. 잠시 후 연결이 종료됩니다.",
      reason: "Teacher viewing detailed results, session ending.",
    };
    await redisClient.publish(
      forceCloseChannel,
      JSON.stringify(forceClosePayload)
    );
    logger.info(
      `[ViewResults] Published force_close_students event to channel ${forceCloseChannel} for PIN: ${pin}`
    );

    // 3. 필요한 데이터 가져오기 및 교사에게 결과 전송
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

    if (validParticipants.length === 0 && studentIdsForResults.length > 0) {
      logger.info(
        `[ViewResults] No valid participant data found after MGET for detailed results, PIN: ${pin}, though ${studentIdsForResults.length} student IDs were present. This might be due to recent disconnections.`
      );
      // 이 경우, 프론트엔드에 "참여 기록이 있는 학생이 없습니다" 와 같이 표시될 수 있도록 빈 결과 구조 전송
    } else if (validParticipants.length === 0) {
      logger.info(
        `[ViewResults] No participants found for detailed results, PIN: ${pin}.`
      );
    }

    // 4. 데이터 분석 및 가공
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

    const totalScoreSum = validParticipants.reduce(
      (sum, p) => sum + p.score,
      0
    );
    const averageScore =
      validParticipants.length > 0
        ? totalScoreSum / validParticipants.length
        : 0;

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

    // 5. 교사에게 결과 전송
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
      `Sent detailedResults to teacher for session PIN: ${pin}. Processed ${validParticipants.length} participants for results.`
    );
  } catch (error) {
    logger.error(
      `[ViewResults] Error in _handleViewDetailedResults for PIN ${pin}:`,
      error
    );
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "상세 결과 보기 중 오류가 발생했습니다.",
        })
      );
    }
  }
}

exports.handleTeacherWebSocketConnection = async (ws, teacherId, pin) => {
  // kahootClients 초기화 시 subscribedChannels Set도 준비
  if (!kahootClients[pin]) {
    kahootClients[pin] = {
      teacher: null,
      students: {},
      subscribedChannels: new Set(), // Set 초기화
      timeLeftTimeoutId: null, // 타이머 ID를 저장할 속성 추가
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
      case "timeUp":
        await _handleTimeUp(pin);
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
