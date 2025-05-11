// 교사 웹소켓 핸들러
const KahootQuizSession = require("../models/KahootQuizSession");
const QuizResult = require("../models/QuizResult");
const redisClient = require("../utils/redisClient");
const logger = require("../utils/logger");
const WebSocket = require("ws");
const {
  kahootClients,
  broadcastToStudents,
  broadcastToActiveStudents,
  setupKeepAlive,
} = require("./kahootShared");
const {
  getSessionKey,
  getSessionQuestionsKey,
  getParticipantKeysPattern,
  getWaitingStudentsKey,
} = require("../utils/redisKeys");
const { redisJsonGet, redisJsonSet } = require("../utils/redisUtils");

// 내부 헬퍼 함수: 세션 리소스 정리
async function _cleanupSessionResources(pin, ws, options = {}) {
  const {
    notifyStudents = true,
    closeStudentSockets = true,
    closeTeacherSocket = false,
  } = options;

  logger.info(`Starting cleanup for session PIN: ${pin}`);

  // 1. 학생들에게 알림 및 연결 종료 (옵션)
  if (notifyStudents) {
    broadcastToStudents(pin, {
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

  // 2. Redis 데이터 삭제 (메타데이터, 참여자, 대기열, 문제 스냅샷)
  try {
    await redisClient.del(getSessionKey(pin));
    await redisClient.del(getSessionQuestionsKey(pin));
    const participantKeys = await redisClient.keys(
      getParticipantKeysPattern(pin)
    );
    if (participantKeys.length > 0) {
      await Promise.all(participantKeys.map((key) => redisClient.del(key)));
    }
    await redisClient.del(getWaitingStudentsKey(pin));
    logger.info(`Deleted Redis data for session ${pin}.`);
  } catch (redisError) {
    logger.error(`Error deleting Redis data for session ${pin}:`, redisError);
  }

  // 3. DB에서 KahootQuizSession 문서 삭제 로직은 완전히 제거됨.
  //    KahootQuizSession 문서는 항상 보존됨.
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
    const participantKeys = await redisClient.keys(
      getParticipantKeysPattern(pin)
    );
    const allParticipantsData = await Promise.all(
      participantKeys.map(async (key) => await redisJsonGet(key))
    );
    const allParticipants = allParticipantsData.filter((p) => p);
    logger.info(
      `Fetched ${allParticipants.length} participants for result processing for session PIN: ${pin}`
    );

    const kahootQuizSessionMongoId = sessionStateToUse.sessionId;
    const { subject, semester, unit /*, teacherId */ } = sessionStateToUse; // teacherId는 QuizResult 스키마 확인 후

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

    const totalQuestions = questionContent.length; // 전체 문제 수
    let resultsSavedCount = 0;

    if (allParticipants.length > 0) {
      for (let participant of allParticipants) {
        if (!participant.student || !participant.responses) {
          // responses가 없거나 비어있을 수 있음
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
          studentScore = 0; // 문제가 없는 경우 0점 처리
        }

        const newQuizResultData = {
          studentId: participant.student,
          sessionId: kahootQuizSessionMongoId,
          subject: subject,
          semester: semester,
          unit: unit,
          results: participant.responses.map((r) => ({
            questionId: r.question,
            studentAnswer: r.answer,
            isCorrect: r.isCorrect,
          })),
          score: studentScore, // 100점 만점 환산 점수 (반올림)
          // teacherId: teacherId, // QuizResult 스키마 확인 후
          // pin: pin, // QuizResult 스키마 확인 후
          // createdAt: new Date(), // QuizResult 스키마에 default 있음.
          // endedAt: new Date(), // QuizResult 스키마 확인 후
          // notes: forUnexpectedClose ? "..." : "...", // QuizResult 스키마 확인 후
        };

        try {
          const newQuizResult = new QuizResult(newQuizResultData);
          await newQuizResult.save();
          resultsSavedCount++;
        } catch (dbError) {
          logger.error(
            `Error saving QuizResult for student ${participant.student}, session ${kahootQuizSessionMongoId}, PIN ${pin}:`,
            dbError
          );
        }
      }
      logger.info(
        `${resultsSavedCount} QuizResult documents created/updated for SessionID (Mongo): ${kahootQuizSessionMongoId}, PIN: ${pin}. Unexpected: ${forUnexpectedClose}`
      );
      return resultsSavedCount > 0;
    } else {
      logger.info(
        `No participants with results to save for SessionID (Mongo): ${kahootQuizSessionMongoId}, PIN: ${pin}.`
      );
      return false;
    }
  } catch (dbError) {
    logger.error(
      `Error saving new QuizResult for SessionID (Mongo) ${sessionStateToUse.sessionId}, PIN: ${pin}:`,
      dbError
    );
    return false;
  }
}

// Helper function for 'startQuiz' message
async function _handleStartQuiz(pin, ws, currentSessionState, questionContent) {
  logger.info(`Handling startQuiz for session PIN: ${pin}`);

  // Redis 세션 메타데이터 업데이트
  currentSessionState.currentQuestionIndex = 0;
  currentSessionState.isQuestionActive = true;
  currentSessionState.quizStarted = true; // 퀴즈 시작됨
  currentSessionState.quizEndedByTeacher = false; // 아직 교사가 종료 안함

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
    return;
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
  broadcastToActiveStudents(pin, readyMessage);

  setTimeout(async () => {
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
    broadcastToActiveStudents(pin, {
      type: "newQuestionOptions",
      questionId: firstQuestion._id,
      options: questionOptions,
      endTime: endTime,
    });
    logger.info(`Quiz started for session PIN: ${pin}, first question sent.`);
  }, 3000);
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
  const newQuestionIndex = currentQuestionIndex + 1;

  const participantKeys = await redisClient.keys(
    getParticipantKeysPattern(pin)
  );
  await Promise.all(
    participantKeys.map(async (key) => {
      const participant = await redisJsonGet(key);
      if (participant) {
        participant.hasSubmitted = false;
        await redisJsonSet(key, participant, { EX: 3600 });
      }
    })
  );
  logger.info(`Participant 'hasSubmitted' reset for session PIN: ${pin}`);

  await redisClient.expire(getSessionQuestionsKey(pin), 3600); // 질문 스냅샷 TTL 갱신
  logger.info(
    `Questions snapshot expiration refreshed for session PIN: ${pin}`
  );

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
    broadcastToActiveStudents(pin, readyMessage);
    logger.info(
      `Sent 'preparingNextQuestion' for session PIN: ${pin}. Is last: ${isLastQuestion}`
    );

    setTimeout(() => {
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
      broadcastToActiveStudents(pin, {
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
    logger.info(
      `All questions have been sent for session PIN: ${pin}. Waiting for 'endQuiz' message.`
    );
  }
}

// Helper function for 'endQuiz' message
async function _handleEndQuiz(pin, ws, currentSessionState, questionContent) {
  logger.info(`Handling endQuiz for session PIN: ${pin}`);
  try {
    // 1. Redis 세션 메타데이터에 교사가 종료했음을 표시
    currentSessionState.quizEndedByTeacher = true;
    currentSessionState.isQuestionActive = false; // 더 이상 질문 활성 아님
    await redisJsonSet(getSessionKey(pin), currentSessionState);
    logger.info(
      `Session state updated in Redis: quizEndedByTeacher=true for PIN: ${pin}`
    );

    // 2. 퀴즈 결과 저장 (MongoDB의 KahootQuizSession은 업데이트하지 않음)
    const resultsSaved = await _saveQuizResults(
      pin,
      currentSessionState,
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
    await _cleanupSessionResources(pin, ws, {
      notifyStudents: true,
      closeStudentSockets: true,
      closeTeacherSocket: true,
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
  }
}

// Helper function for 'viewDetailedResults' message
async function _handleViewDetailedResults(pin, ws, currentSessionState) {
  logger.info(`Handling viewDetailedResults for session PIN: ${pin}`);
  // 이 함수는 주로 Redis의 참여자 데이터를 기반으로 결과를 보여주므로,
  // KahootQuizSession 스키마 변경의 직접적인 영향은 적음.
  // 다만, 결과 화면에서 원본 질문 내용을 보여줘야 한다면,
  // 핸들러 메모리에 있는 questionContent (세션 스냅샷)를 활용.
  const participantKeys = await redisClient.keys(
    getParticipantKeysPattern(pin)
  );
  const participantsResultsData = await Promise.all(
    participantKeys.map(async (key) => {
      const participant = await redisJsonGet(key);
      if (!participant) return null;
      return {
        studentId: participant.student,
        name: participant.name,
        score: participant.score,
        responses: participant.responses.map((response) => ({
          questionId: response.question, // 스냅샷 질문 ID
          answer: response.answer,
          isCorrect: response.isCorrect,
        })),
      };
    })
  );
  const validResults = participantsResultsData.filter((r) => r);

  ws.send(
    JSON.stringify({
      type: "detailedResults",
      results: validResults,
      // 필요하다면 여기서 questionContent (문제 스냅샷 전체)를 함께 보내서
      // 클라이언트가 각 questionId에 해당하는 문제 텍스트 등을 표시할 수 있도록 함.
      // quizQuestions: questionContent, // 예시
    })
  );
  logger.info(`Sent detailedResults to teacher for session PIN: ${pin}`);
}

exports.handleTeacherWebSocketConnection = async (ws, teacherId, pin) => {
  if (!kahootClients[pin]) {
    kahootClients[pin] = {
      teacher: null,
      students: {},
    };
  }

  kahootClients[pin].teacher = ws;
  logger.info(`Teacher connected to session: ${pin}`);

  setupKeepAlive(ws, pin, "Teacher");

  const sessionMetadataKey = getSessionKey(pin);
  let sessionFromRedis = await redisJsonGet(sessionMetadataKey); // 변수명 변경: session -> sessionFromRedis

  if (!sessionFromRedis) {
    logger.error(
      `Session metadata not found in Redis for pin: ${pin} on teacher connect.`
    );
    ws.send(JSON.stringify({ error: "Session data not found, cannot start." }));
    ws.close();
    return;
  }

  const sessionQuestionsKey = getSessionQuestionsKey(pin);
  let questionContent = await redisJsonGet(sessionQuestionsKey);

  if (!questionContent) {
    logger.warn(
      `Questions snapshot not found in Redis for pin: ${pin}. Attempting to load from DB.`
    );
    // sessionFromRedis.sessionId 는 MongoDB의 KahootQuizSession의 _id임
    if (sessionFromRedis.sessionId) {
      const dbSession = await KahootQuizSession.findById(
        sessionFromRedis.sessionId // 여기서 KahootQuizSession 모델 사용
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
    logger.info(`Teacher WebSocket for pin ${pin} closed.`);
    const currentSessionOnClose = await redisJsonGet(sessionMetadataKey);

    let cleanupOptions = {
      notifyStudents: true,
      closeStudentSockets: true,
      closeTeacherSocket: false,
    };

    if (
      currentSessionOnClose &&
      questionContent && // 핸들러 스코프에 로드된 문제 스냅샷
      questionContent.length > 0
    ) {
      const quizWasStarted = currentSessionOnClose.quizStarted === true;
      const allQuestionsWerePresented =
        currentSessionOnClose.currentQuestionIndex >=
        questionContent.length - 1;
      // 교사가 명시적으로 종료하지 않았는지 Redis 상태로 확인
      const quizNotExplicitlyEndedByTeacher =
        currentSessionOnClose.quizEndedByTeacher !== true;

      if (
        quizWasStarted &&
        allQuestionsWerePresented &&
        quizNotExplicitlyEndedByTeacher
      ) {
        logger.info(
          `Teacher WebSocket for PIN ${pin} closed. Conditions met for auto-saving results (started, all presented, not explicitly ended by teacher).`
        );
        try {
          // true: forUnexpectedClose
          const resultsSaved = await _saveQuizResults(
            pin,
            currentSessionOnClose,
            questionContent,
            true
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
          `Teacher WebSocket closed for PIN ${pin}. Conditions for auto-saving results NOT met (started: ${quizWasStarted}, allPresented: ${allQuestionsWerePresented}, notExplicitlyEnded: ${quizNotExplicitlyEndedByTeacher}).`
        );
      }
    } else {
      logger.warn(
        `Cannot determine if results should be saved for PIN ${pin} on close; session data from Redis or question content missing.`
      );
    }

    await _cleanupSessionResources(pin, ws, cleanupOptions);
    logger.info(
      `Cleanup after teacher WebSocket close for PIN ${pin} finished. KahootQuizSession in DB preserved.`
    );
  });

  ws.on("error", (error) => {
    logger.error(
      `Error occurred on teacher connection for pin ${pin}: ${error}`
    );
  });

  ws.on("message", async (message) => {
    const parsedMessage = JSON.parse(message);
    // 매 메시지 처리 시 Redis에서 최신 세션 메타데이터를 가져옴
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
      // 여기서 ws.close()를 호출하여 연결을 정리할 수도 있음
      return;
    }
    // questionContent는 핸들러 인스턴스 메모리에 이미 로드되어 있음

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
        await _handleViewDetailedResults(pin, ws, currentSessionState); // questionContent도 전달 가능
        break;
      default:
        logger.warn(
          `Unknown message type received from teacher for pin ${pin}: ${parsedMessage.type}`
        );
    }
  });
};
