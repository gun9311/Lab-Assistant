const Student = require("../models/Student"); // 학생 모델 불러오기
const redisClient = require("../utils/redisClient"); // redisClient 직접 사용은 줄어듦
const logger = require("../utils/logger"); // logger는 이미 import 되어 있을 가능성 높음
const WebSocket = require("ws");
const {
  kahootClients,
  broadcastToTeacher,
  setupKeepAlive,
} = require("./kahootShared");
const {
  getSessionKey,
  getParticipantKey,
  getParticipantKeysPattern,
  getWaitingStudentsKey,
  getSessionQuestionsKey,
} = require("../utils/redisKeys");
const { redisJsonGet, redisJsonSet } = require("../utils/redisUtils"); // 새로운 헬퍼 함수 import

// Helper function to process submissions and waiting list
async function handleAllSubmissionsProcessing(
  pin,
  session, // session은 이미 파싱된 객체로 전달받는다고 가정
  currentQuestion,
  allParticipants // allParticipants는 이미 파싱된 객체들의 배열이라고 가정
) {
  // Send feedback to each student and update their hasSubmitted status
  allParticipants.forEach(async (p) => {
    const studentWs = kahootClients[pin].students[p.student];
    if (studentWs && studentWs.readyState === WebSocket.OPEN) {
      const response = p.responses.find(
        (r) => r.question.toString() === currentQuestion._id.toString()
      );

      let teamForScore = null;
      if (session.isTeamMode) {
        const team = session.teams.find((t) => t.members.includes(p.student));
        if (team) {
          teamForScore = team.teamScore;
        }
      }

      studentWs.send(
        JSON.stringify({
          type: "feedback",
          correct: response ? response.isCorrect : false, // Ensure response exists
          score: p.score,
          teamScore: session.isTeamMode ? teamForScore : null,
        })
      );
    }

    // Set hasSubmitted to false after sending feedback
    p.hasSubmitted = false;
    const currentParticipantKey = getParticipantKey(pin, p.student);
    // await redisClient.set(currentParticipantKey, JSON.stringify(p), { EX: 3600 });
    await redisJsonSet(currentParticipantKey, p, { EX: 3600 }); // 변경
  });

  // Broadcast to teacher
  broadcastToTeacher(pin, {
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

  // Update session state
  session.isQuestionActive = false;
  // await redisClient.set(getSessionKey(pin), JSON.stringify(session), { EX: 3600 });
  await redisJsonSet(getSessionKey(pin), session, { EX: 3600 }); // 변경

  // Process waiting list
  // const waitingStudentsData = await redisClient.get(getWaitingStudentsKey(pin));
  // const studentsToAdd = waitingStudentsData ? JSON.parse(waitingStudentsData) : [];
  const studentsToAdd = (await redisJsonGet(getWaitingStudentsKey(pin))) || []; // 변경

  for (const { id: studentIdToAdd, character } of studentsToAdd) {
    const studentDetails = await Student.findById(studentIdToAdd);
    if (studentDetails) {
      const newParticipantKey = getParticipantKey(pin, studentIdToAdd);
      const newParticipantData = {
        student: studentIdToAdd,
        name: studentDetails.name,
        score: 0,
        responses: [],
        status: "joined",
        hasSubmitted: false,
        character: character,
      };
      // await redisClient.set(newParticipantKey,JSON.stringify(newParticipantData),{EX: 3600});
      await redisJsonSet(newParticipantKey, newParticipantData, { EX: 3600 }); // 변경

      broadcastToTeacher(pin, {
        type: "studentJoined",
        studentId: studentIdToAdd,
        name: studentDetails.name,
        character: character,
        isReady: true,
      });
      logger.info(
        `Notified teacher about student ${studentIdToAdd} joining with character ${character}`
      );
    }
  }
  // Clear waiting list
  // await redisClient.set(getWaitingStudentsKey(pin), JSON.stringify([]), { EX: 3600 });
  await redisJsonSet(getWaitingStudentsKey(pin), [], { EX: 3600 }); // 변경
}

// --- 내부 헬퍼 함수들 ---

// Helper function for 'characterSelected' message
async function _handleCharacterSelected(
  ws,
  studentId,
  pin,
  parsedMessage,
  currentSession,
  student
) {
  logger.info(
    `Handling characterSelected for student ${studentId} in session ${pin}`
  );
  const character = parsedMessage.character;

  if (currentSession.isQuestionActive) {
    const waitingStudentsKey = getWaitingStudentsKey(pin);
    let waitingStudentsList = (await redisJsonGet(waitingStudentsKey)) || [];
    if (!waitingStudentsList.some((s) => s.id === studentId)) {
      waitingStudentsList.push({ id: studentId, character });
      await redisJsonSet(waitingStudentsKey, waitingStudentsList, { EX: 3600 });
    }
    ws.send(
      JSON.stringify({ message: "대기 중입니다. 잠시 후 참여 가능합니다." })
    );
    return;
  }

  if (!student) {
    ws.send(JSON.stringify({ error: "학생을 찾을 수 없습니다." }));
    return;
  }

  const participantKey = getParticipantKey(pin, studentId);
  const existingParticipant = await redisJsonGet(participantKey);
  if (existingParticipant) {
    ws.send(JSON.stringify({ error: "Already joined" }));
    return;
  }

  const participantData = {
    student: studentId,
    name: student.name,
    score: 0,
    responses: [],
    status: "ready",
    hasSubmitted: false,
    character: character,
  };
  await redisJsonSet(participantKey, participantData, { EX: 3600 });

  broadcastToTeacher(pin, {
    type: "studentJoined",
    studentId: studentId,
    name: student.name,
    character: character,
    isReady: true,
  });
  logger.info(
    `Notified teacher about student ${studentId} joining with character ${character}`
  );

  Object.entries(kahootClients[pin].students).forEach(([id, studentWs]) => {
    if (studentWs.readyState === WebSocket.OPEN && id !== studentId) {
      studentWs.send(
        JSON.stringify({
          type: "characterSelected",
          studentId: studentId,
          character: character,
        })
      );
    }
  });
  ws.send(
    JSON.stringify({
      type: "characterAcknowledged",
      message: "Character selection successful",
    })
  );
}

// Helper function for 'submitAnswer' message
async function _handleSubmitAnswer(
  ws,
  studentId,
  pin,
  parsedMessage,
  currentSession,
  student,
  questionContent
) {
  logger.info(
    `Handling submitAnswer for student ${studentId} in session ${pin}`
  );
  const { questionId, answerIndex, responseTime } = parsedMessage;

  const currentQuestion = questionContent.find(
    (q) => q._id.toString() === questionId
  );
  if (!currentQuestion) {
    ws.send(JSON.stringify({ error: "Invalid question ID" }));
    return;
  }

  let isCorrect = false;
  if (answerIndex !== -1) {
    isCorrect = Number(currentQuestion.correctAnswer) === Number(answerIndex);
  }

  const participantKey = getParticipantKey(pin, studentId);
  const participant = await redisJsonGet(participantKey);

  if (participant) {
    participant.responses.push({
      question: currentQuestion._id,
      answer: answerIndex !== -1 ? answerIndex : null,
      isCorrect: isCorrect,
      responseTime: responseTime,
    });

    const maxScore = 1000;
    const baseScore = 500;
    const responseTimeInSeconds = responseTime / 1000;
    const timeFactor =
      Math.max(0, currentQuestion.timeLimit - responseTimeInSeconds) /
      currentQuestion.timeLimit;

    if (isCorrect) {
      const score = baseScore + Math.floor((maxScore - baseScore) * timeFactor);
      participant.score += score;
      if (currentSession.isTeamMode && currentSession.teams) {
        const team = currentSession.teams.find((t) =>
          t.members.includes(studentId)
        );
        if (team) {
          team.teamScore += score;
        }
      }
    }
    participant.hasSubmitted = true;
    await redisJsonSet(participantKey, participant, { EX: 3600 });

    if (currentSession.isTeamMode && isCorrect && currentSession.teams) {
      await redisJsonSet(getSessionKey(pin), currentSession, { EX: 3600 });
    }

    broadcastToTeacher(pin, {
      type: "studentSubmitted",
      studentId: studentId,
      name: student.name,
      character: participant.character,
    });

    const participantKeys = await redisClient.keys(
      getParticipantKeysPattern(pin)
    );
    const allParticipantsData = await Promise.all(
      participantKeys.map(async (key) => await redisJsonGet(key))
    );
    const validParticipants = allParticipantsData.filter((p) => p);

    if (validParticipants.length > 0) {
      const allSubmitted = validParticipants.every((p) => p.hasSubmitted);
      if (allSubmitted) {
        const latestSession = await redisJsonGet(getSessionKey(pin));
        await handleAllSubmissionsProcessing(
          pin,
          latestSession || currentSession,
          currentQuestion,
          validParticipants
        );
      }
    }
  } else {
    ws.send(JSON.stringify({ error: "Participant not found" }));
  }
}

// Helper function for 'getTakenCharacters' message
async function _handleGetTakenCharacters(ws, studentId, pin) {
  logger.info(
    `Handling getTakenCharacters for student ${studentId} in session ${pin}`
  );
  const participantKeys = await redisClient.keys(
    getParticipantKeysPattern(pin)
  );
  const takenCharacters = new Set();

  for (const key of participantKeys) {
    const participant = await redisJsonGet(key);
    if (participant && participant.character) {
      const characterIndex =
        parseInt(participant.character.replace("character", "")) - 1;
      takenCharacters.add(characterIndex);
    }
  }

  ws.send(
    JSON.stringify({
      type: "takenCharacters",
      takenCharacters: Array.from(takenCharacters),
    })
  );
}

// --- 메인 핸들러 ---
exports.handleStudentWebSocketConnection = async (ws, studentId, pin) => {
  const student = await Student.findById(studentId);
  if (!student) {
    ws.send(JSON.stringify({ error: "Student not found" }));
    ws.close();
    return;
  }

  if (!kahootClients[pin]) {
    logger.warn(
      `kahootClients[${pin}] not initialized. Forcing initialization.`
    );
    kahootClients[pin] = { teacher: null, students: {} };
  }
  if (!kahootClients[pin].students) {
    kahootClients[pin].students = {};
  }
  kahootClients[pin].students[studentId] = ws;
  logger.info(`Student ${studentId} connected to session: ${pin}`);
  setupKeepAlive(ws, pin, "Student");

  let initialSession = await redisJsonGet(getSessionKey(pin));
  if (!initialSession) {
    ws.send(JSON.stringify({ error: "Session not found" }));
    ws.close();
    return;
  }
  let initialQuestionContent = await redisJsonGet(getSessionQuestionsKey(pin));
  if (!initialQuestionContent) {
    logger.error(
      `Questions snapshot not found in Redis for pin: ${pin} on student connect.`
    );
    ws.send(
      JSON.stringify({ error: "Quiz questions not found for this session." })
    );
    return;
  }

  ws.on("close", async () => {
    logger.info(
      `Student WebSocket for student ${studentId} in pin ${pin} closed by main handler.`
    );
    if (kahootClients[pin] && kahootClients[pin].students) {
      delete kahootClients[pin].students[studentId];
    }

    const waitingStudentsKey = getWaitingStudentsKey(pin);
    let waitingStudentsList = await redisJsonGet(waitingStudentsKey);
    if (waitingStudentsList) {
      const updatedWaitingStudentsList = waitingStudentsList.filter(
        (s) => s.id !== studentId
      );
      if (updatedWaitingStudentsList.length < waitingStudentsList.length) {
        await redisJsonSet(waitingStudentsKey, updatedWaitingStudentsList, {
          EX: 3600,
        });
      }
    }

    const participantKeyOfClosedStudent = getParticipantKey(pin, studentId);
    // await redisJsonSet(participantKeyOfClosedStudent, null, { EX: 1 }); // 매우 짧은 만료시간으로 사실상 삭제
    // 또는 특정 필드를 업데이트하여 비활성 상태로 표시할 수도 있습니다.
    // 예: const participant = await redisJsonGet(participantKeyOfClosedStudent);
    // if (participant) {
    //   participant.status = "disconnected";
    //   await redisJsonSet(participantKeyOfClosedStudent, participant, { EX: 3600 });
    // }

    if (kahootClients[pin] && kahootClients[pin].teacher && kahootClients[pin].teacher.readyState === WebSocket.OPEN) {
      broadcastToTeacher(pin, {
        type: "studentDisconnected",
        studentId: studentId,
        name: student.name, // student 객체가 이 스코프에서 사용 가능해야 함
      });
    }

    // 추가된 로직: 연결 종료된 학생을 제외한 나머지 학생들의 제출 상태 확인
    try {
      const currentSession = await redisJsonGet(getSessionKey(pin));
      if (
        currentSession &&
        currentSession.quizStarted &&
        currentSession.isQuestionActive
      ) {
        const questionContent = await redisJsonGet(getSessionQuestionsKey(pin));
        const currentQuestionId = currentSession.currentQuestionId;

        if (questionContent && currentQuestionId) {
          const currentQuestion = questionContent.find(
            (q) => q._id.toString() === currentQuestionId.toString()
          );

          if (currentQuestion) {
            const participantKeys = await redisClient.keys(
              getParticipantKeysPattern(pin)
            );
            // 연결 종료된 학생의 키를 필터링 (이미 null로 설정했다면 자동으로 걸러질 수 있음)
            const activeParticipantKeys = participantKeys.filter(
              (key) => key !== participantKeyOfClosedStudent
            );

            if (activeParticipantKeys.length > 0) {
              const allParticipantsData = await Promise.all(
                activeParticipantKeys.map(
                  async (key) => await redisJsonGet(key)
                )
              );
              const validParticipants = allParticipantsData.filter(
                (p) => p && p.status !== "disconnected" // 명시적으로 disconnected 상태가 아닌 참여자만 고려
              );

              if (
                validParticipants.length > 0 &&
                validParticipants.every((p) => p.hasSubmitted)
              ) {
                logger.info(
                  `Student ${studentId} disconnected from PIN ${pin}. All other active students have submitted. Processing submissions.`
                );
                await handleAllSubmissionsProcessing(
                  pin,
                  currentSession,
                  currentQuestion,
                  validParticipants
                );
              } else {
                logger.info(
                  `Student ${studentId} disconnected from PIN ${pin}. Not all other active students have submitted.`
                );
              }
            } else {
              logger.info(
                `Student ${studentId} disconnected from PIN ${pin}. No other active students found. Processing submissions if applicable (e.g. last student).`
              );
              // 모든 학생이 나간 경우 (이 학생이 마지막이었던 경우),
              // 교사 핸들러의 _handleNextQuestion이나 _handleEndQuiz에서 처리될 수 있도록 두거나,
              // 여기서 명시적으로 모든 제출 처리 로직을 한번 더 호출할 수 있습니다.
              // 여기서는 일단 남은 학생이 0명일 때 모든 제출 처리를 호출합니다. (교사 핸들러에서 마지막 학생이 나갔을때의 처리가 없다면)
              // 이 시점에서는 validParticipants가 비어있을 것이므로 handleAllSubmissionsProcessing에 빈 배열 전달
              await handleAllSubmissionsProcessing(
                pin,
                currentSession,
                currentQuestion,
                [] // 빈 배열 전달
              );
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        `Error during submission check on student disconnect for PIN ${pin}, student ${studentId}:`,
        error
      );
    }
    // 참여자 데이터 삭제는 모든 로직이 끝난 후 수행
    await redisClient.del(participantKeyOfClosedStudent);

    if (
      kahootClients[pin] &&
      kahootClients[pin].students &&
      kahootClients[pin].teacher &&
      Object.keys(kahootClients[pin].students).length === 0
    ) {
      broadcastToTeacher(pin, {
        type: "noStudentsRemaining",
        message: "모든 학생이 퀴즈를 떠났습니다. 세션을 종료하시겠습니까?",
      });
    }
  });

  ws.on("error", (error) => {
    logger.error(
      `Error on student ${studentId} connection for pin ${pin}: ${error}`
    );
  });

  ws.on("message", async (message) => {
    const parsedMessage = JSON.parse(message);
    logger.info(
      `Received message from student ${studentId}: ${JSON.stringify(
        parsedMessage
      )}`
    );

    const currentSession = await redisJsonGet(getSessionKey(pin));
    if (!currentSession) {
      ws.send(
        JSON.stringify({
          error: `Session ${pin} not found during message processing.`,
        })
      );
      logger.warn(
        `Session ${pin} not found for student ${studentId} processing message type ${parsedMessage.type}.`
      );
      return;
    }

    const currentQuestionContent = await redisJsonGet(
      getSessionQuestionsKey(pin)
    );
    if (!currentQuestionContent) {
      ws.send(
        JSON.stringify({
          error: `Quiz questions for session ${pin} not found.`,
        })
      );
      logger.warn(
        `Quiz questions for session ${pin} not found processing message type ${parsedMessage.type}.`
      );
      return;
    }

    try {
      switch (parsedMessage.type) {
        case "characterSelected":
          await _handleCharacterSelected(
            ws,
            studentId,
            pin,
            parsedMessage,
            currentSession,
            student
          );
          break;
        case "submitAnswer":
          await _handleSubmitAnswer(
            ws,
            studentId,
            pin,
            parsedMessage,
            currentSession,
            student,
            currentQuestionContent
          );
          break;
        case "getTakenCharacters":
          await _handleGetTakenCharacters(ws, studentId, pin);
          break;
        default:
          logger.warn(
            `No handler for student message type: ${parsedMessage.type} from student ${studentId} in pin ${pin}`
          );
      }
    } catch (error) {
      logger.error(
        `Error in student message handler for type ${parsedMessage.type} (pin: ${pin}, student: ${studentId}):`,
        error
      );
      ws.send(JSON.stringify({ type: "error", message: "An error occurred." }));
    }
  });
};
