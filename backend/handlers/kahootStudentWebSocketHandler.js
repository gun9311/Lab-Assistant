const Student = require("../models/Student"); // 학생 모델 불러오기
const { redisClient } = require("../utils/redisClient"); // redisClient 직접 사용은 줄어듦
const logger = require("../utils/logger"); // logger는 이미 import 되어 있을 가능성 높음
const WebSocket = require("ws");
const {
  kahootClients,
  broadcastToTeacher,
  setupKeepAlive,
  broadcastToStudents,
  publishIndividualFeedbackList,
  subscribeToPinChannels,
  unsubscribeFromPinChannels,
  getActiveStudentCount,
  // handleAllSubmissionsProcessing,
} = require("./kahootShared");
const {
  getSessionKey,
  getParticipantKey,
  getSessionQuestionsKey,
  getSessionStudentIdsSetKey,
  getSessionTakenCharactersSetKey,
  getTeacherViewingResultsFlagKey,
} = require("../utils/redisKeys");
const {
  redisJsonGet,
  redisJsonSet,
  redisJsonMGet,
} = require("../utils/redisUtils"); // 새로운 헬퍼 함수 import

// Helper function to process submissions and waiting list
// 모든 'connected_participating' 학생이 현재 문제에 대한 답을 제출했을 때 호출됩니다.
// 학생들에게 피드백을 전송하고, hasSubmitted 상태를 초기화하며, 교사에게 요약 정보를 보냅니다.
// 또한, 'connected_waiting' 상태의 학생들을 'connected_participating'으로 전환합니다.
async function handleAllSubmissionsProcessing(
  pin,
  session, // 이 session 인자는 _checkAndFinalizeCurrentQuestionIfNeeded 에서 전달된 상태일 수 있음
  currentQuestion,
  allParticipants
) {
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

// Helper function for 'characterSelected' message
// 학생이 캐릭터를 선택했을 때 호출됩니다.
// 캐릭터 중복을 확인하고, 참여자 정보를 Redis에 저장하며, 다른 클라이언트에게 알립니다.
// 퀴즈 진행 상태(isQuestionActive)에 따라 참여자 상태를 'connected_participating' 또는 'connected_waiting'으로 설정합니다.
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
  const character = parsedMessage.character; // 예: "character1"
  const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
  const takenCharactersSetKey = getSessionTakenCharactersSetKey(pin); // 선점된 캐릭터 Set 키

  // 🎭 새로운 검증: 선택한 캐릭터가 이 세션에서 사용 가능한지 확인
  const characterIndex = parseInt(character.replace("character", "")) - 1; // "character1" -> 0
  if (
    !currentSession.availableCharacters ||
    !Array.isArray(currentSession.availableCharacters) ||
    !currentSession.availableCharacters.includes(characterIndex)
  ) {
    logger.warn(
      `Student ${studentId} in session ${pin} tried to select unavailable character ${character} (index: ${characterIndex})`
    );
    ws.send(
      JSON.stringify({
        error: "This character is not available in this session",
        type: "characterNotAvailable",
      })
    );
    return;
  }

  const studentLockKey = `lock:charselect:${pin}:${studentId}`;
  let studentLockAcquired = false;

  try {
    studentLockAcquired = await redisClient.set(
      studentLockKey,
      "locked",
      "EX",
      5,
      "NX"
    );
    if (!studentLockAcquired) {
      return;
    }

    const characterSpecificLockKey = `lock:char:${pin}:${character}`;
    let characterLockAcquired = false;

    try {
      characterLockAcquired = await redisClient.set(
        characterSpecificLockKey,
        "locked",
        "EX",
        5, // 짧은 TTL, 이 로직 블록 동안만 유효하면 됨
        "NX"
      );
      if (!characterLockAcquired) {
        ws.send(
          JSON.stringify({
            error:
              "Character is being selected by someone else, please try another or wait.",
          })
        );
        return;
      }

      // 1. "선점된 캐릭터 Set"에서 이미 선택된 캐릭터인지 확인
      const isCharacterTaken = await redisClient.sIsMember(
        takenCharactersSetKey,
        character // character는 "character1"과 같은 문자열이어야 함
      );

      if (isCharacterTaken) {
        logger.warn(
          `Character conflict: Student ${studentId} in session ${pin} tried to select character ${character}, which is already in takenCharactersSetKey.`
        );
        ws.send(JSON.stringify({ error: "Character already taken" }));
        return;
      }

      // 기존 참여자 정보 확인 (동일 학생이 다시 캐릭터를 선택하려는 경우 등)
      const participantKey = getParticipantKey(pin, studentId);
      const existingParticipant = await redisJsonGet(participantKey);
      if (
        existingParticipant &&
        existingParticipant.character &&
        (existingParticipant.status === "connected_participating" ||
          existingParticipant.status === "connected_waiting")
      ) {
        logger.warn(
          `Student ${studentId} in session ${pin} sent 'characterSelected' (${character}) but already has character '${existingParticipant.character}' and status '${existingParticipant.status}'. Resending acknowledgment.`
        );
        ws.send(
          JSON.stringify({
            type: "characterAcknowledged",
            character: existingParticipant.character,
            message: "Character selection was already confirmed.",
          })
        );
        // 이 경우, takenCharactersSetKey에 이미 해당 캐릭터가 있을 수 있으므로 추가 로직 불필요
        return;
      }

      // 기존의 allStudentIdsInSession 루프를 통한 캐릭터 중복 검사 로직은 제거됨
      // (위의 SISMEMBER로 대체)

      const newParticipantData = {
        student: studentId,
        name: student.name,
        score: 0,
        responses: [],
        hasSubmitted: false,
        character: character, // 학생 데이터에는 여전히 캐릭터 정보 저장
      };

      // 학생 참여자 데이터 저장
      await redisJsonSet(participantKey, newParticipantData, { EX: 3600 });

      // "선점된 캐릭터 Set"에 캐릭터 추가
      const saddTakenCharResult = await redisClient.sAdd(
        takenCharactersSetKey,
        character
      );
      if (saddTakenCharResult > 0) {
        // 캐릭터가 Set에 성공적으로 추가된 경우
        await redisClient.expire(takenCharactersSetKey, 3600); // TTL 설정 또는 갱신
        logger.info(
          `Character ${character} added to takenCharactersSetKey ${takenCharactersSetKey} and TTL (re)set.`
        );
      }

      // 학생 ID를 학생 ID Set에 추가 (기존 로직 유지)
      const saddStudentIdResult = await redisClient.sAdd(
        studentIdsSetKey,
        studentId
      );
      if (saddStudentIdResult > 0) {
        await redisClient.expire(studentIdsSetKey, 3600);
        logger.info(
          `Student ID Set ${studentIdsSetKey} TTL (re)set for student ${studentId}.`
        );
      }
      logger.info(
        `Student ${studentId} added to Student ID Set ${studentIdsSetKey}.`
      );

      if (currentSession.isQuestionActive) {
        newParticipantData.status = "connected_waiting";
        // newParticipantData는 위에서 이미 저장했으므로, 여기서는 상태만 업데이트하고 다시 저장할 필요는 없음
        // 단, newParticipantData 객체의 status를 변경했으므로, redisJsonSet을 다시 호출해야 함.
        // 혹은 newParticipantData 구성 시점에 status를 결정해야 함.
        // 여기서는 newParticipantData를 먼저 구성하고, status 설정 후 한번만 저장하도록 순서 조정.
      } else {
        newParticipantData.status = "connected_participating";
      }
      // newParticipantData.status가 결정된 후 최종 저장
      await redisJsonSet(participantKey, newParticipantData, { EX: 3600 });

      // 이후 로직 (ws.send, broadcastToTeacher, broadcastToStudents 등)은
      // newParticipantData.status 값에 따라 분기하여 처리

      if (newParticipantData.status === "connected_waiting") {
        logger.info(
          `Student ${studentId} selected character ${character} during active quiz. Status set to connected_waiting.`
        );
        ws.send(
          JSON.stringify({
            type: "characterAcknowledged",
            character: character,
            message:
              "Character selected. You will join from the next question.",
          })
        );
      } else {
        // connected_participating
        logger.info(
          `Student ${studentId} selected character ${character}. Status set to connected_participating.`
        );
        await broadcastToTeacher(pin, {
          type: "studentJoined",
          studentId: studentId,
          name: student.name,
          character: character,
          isReady: true,
        });
        logger.info(
          `Notified teacher about student ${studentId} joining with character ${character}`
        );
        ws.send(
          JSON.stringify({
            type: "characterAcknowledged",
            message: "Character selection successful",
            character: character,
          })
        );
      }

      await broadcastToStudents(pin, {
        type: "characterSelected",
        studentId: studentId,
        character: character, // 선택된 캐릭터 정보 브로드캐스트
      });
      logger.info(
        `Broadcasted character selection by ${studentId} to all students in session ${pin}.`
      );
    } finally {
      if (characterLockAcquired) {
        await redisClient.del(characterSpecificLockKey);
      }
    }
  } catch (error) {
    logger.error(
      `[CharSelect] Error during character selection for student ${studentId}, PIN ${pin}:`,
      error
    );
    ws.send(
      JSON.stringify({ error: "An error occurred during character selection." })
    );
  } finally {
    if (studentLockAcquired) {
      await redisClient.del(studentLockKey);
    }
  }
}

// 새로운 공통 헬퍼 함수: 현재 질문에 대해 모든 활성 참여자의 제출 상태를 확인하고 필요시 다음 단계로 진행
async function _checkAndFinalizeCurrentQuestionIfNeeded(
  pin,
  studentActionContext = ""
) {
  // studentActionContext는 로깅을 위해 어떤 상황에서 호출되었는지 명시 (예: "submitAnswer", "studentDisconnect")
  logger.info(
    `[${studentActionContext}] Checking submission status for all active participants in PIN: ${pin}`
  );

  const sessionState = await redisJsonGet(getSessionKey(pin));
  if (
    !sessionState ||
    !sessionState.quizStarted ||
    !sessionState.isQuestionActive
  ) {
    logger.info(
      `[${studentActionContext}] Quiz not started or question not active for PIN: ${pin}. No action needed.`
    );
    return;
  }

  const questions = await redisJsonGet(getSessionQuestionsKey(pin));
  const currentQuestionId = sessionState.currentQuestionId;

  if (!questions || !currentQuestionId) {
    logger.warn(
      `[${studentActionContext}] Questions or currentQuestionId not found for PIN: ${pin}. Cannot finalize question.`
    );
    return;
  }

  const currentQ = questions.find(
    (q) => q._id.toString() === currentQuestionId.toString()
  );

  if (!currentQ) {
    logger.warn(
      `[${studentActionContext}] Current question (ID: ${currentQuestionId}) not found in snapshot for PIN: ${pin}. Cannot finalize question.`
    );
    return;
  }

  const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
  let allValidPData = [];

  try {
    const allStudentIdsInSession = await redisClient.sMembers(studentIdsSetKey);

    if (allStudentIdsInSession.length === 0) {
      logger.info(
        `[${studentActionContext}] No student IDs found in Set for PIN: ${pin}. Finalizing question with empty participants.`
      );
      await handleAllSubmissionsProcessing(pin, sessionState, currentQ, []);
      return;
    }

    const participantKeys = allStudentIdsInSession.map((sid) =>
      getParticipantKey(pin, sid)
    );
    const participantDataArray = await redisJsonMGet(participantKeys); // MGET 사용

    if (participantDataArray) {
      allStudentIdsInSession.forEach((studentIdForResult, index) => {
        const participantData = participantDataArray[index];
        if (participantData) {
          allValidPData.push(participantData);
        } else {
          logger.warn(
            `[${studentActionContext}] Participant data for studentId ${studentIdForResult} was null or invalid (MGET) for PIN: ${pin}.`
          );
        }
      });
    } else {
      logger.error(
        `[${studentActionContext}] Failed to get participant data array via MGET for PIN: ${pin}.`
      );
      return; // MGET 실패 시 더 이상 진행 불가
    }
  } catch (error) {
    logger.error(
      `[${studentActionContext}] Error fetching student IDs from Set or MGET participant data for PIN: ${pin}. Error:`,
      error
    );
    return; // 키 조회 실패 시 더 이상 진행 불가
  }

  const activeParticipants = allValidPData.filter(
    (p) => p && p.status === "connected_participating"
  );

  if (activeParticipants.length === 0) {
    logger.info(
      `[${studentActionContext}] No 'connected_participating' students found for PIN: ${pin} among ${allValidPData.length} valid participants. Finalizing question.`
    );
    await handleAllSubmissionsProcessing(pin, sessionState, currentQ, []);
  } else if (activeParticipants.every((p) => p.hasSubmitted)) {
    logger.info(
      `[${studentActionContext}] All ${activeParticipants.length} active students have submitted for PIN: ${pin}. Finalizing question.`
    );
    await handleAllSubmissionsProcessing(
      pin,
      sessionState,
      currentQ,
      activeParticipants
    );
  } else {
    const submittedCount = activeParticipants.filter(
      (p) => p.hasSubmitted
    ).length;
    logger.info(
      `[${studentActionContext}] Not all active students have submitted for PIN: ${pin}. (${submittedCount}/${activeParticipants.length} submitted). Waiting for more submissions.`
    );
  }
}

// Helper function for 'submitAnswer' message
// 학생이 문제에 대한 답을 제출했을 때 호출됩니다.
// 제출 유효성 검사, 정답 처리, 점수 계산, Redis에 참여자 정보 업데이트,
// 그리고 모든 학생 제출 시 다음 단계 처리(handleAllSubmissionsProcessing)를 수행합니다.
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
  const { questionId, answerIndex } = parsedMessage;

  // --- BEGIN MODIFICATION: Add Lock ---
  const lockKey = `lock:submit:${pin}:${studentId}:${questionId}`;
  let lockAcquired = false;
  try {
    // NX: Only set the key if it does not already exist.
    // EX: Set the specified expire time, in seconds.
    const result = await redisClient.set(lockKey, "locked", "EX", 5, "NX");
    lockAcquired = result === "OK";

    if (!lockAcquired) {
      logger.warn(
        `[SubmitAnswer] Could not acquire lock for student ${studentId}, question ${questionId}, PIN ${pin}. Submission likely in progress or recently completed.`
      );
      ws.send(
        JSON.stringify({
          error:
            "Submission processing. If your answer isn't recorded shortly, please check. You may retry if time allows.",
        })
      );
      return;
    }
    // --- END MODIFICATION: Add Lock ---

    // 서버에서 응답 시간 계산
    const questionStartTime = currentSession.questionStartTime || Date.now(); // 시작 시간이 없으면 현재 시간으로 대체
    const responseTime = Date.now() - questionStartTime;

    const participantKey = getParticipantKey(pin, studentId);
    const participant = await redisJsonGet(participantKey);

    if (!participant || participant.status !== "connected_participating") {
      ws.send(
        JSON.stringify({ error: "Not an active participant or not found." })
      );
      logger.warn(
        `Student ${studentId} in pin ${pin} tried to submit answer but is not 'connected_participating' or not found. Status: ${participant?.status}`
      );
      return; // Lock will auto-expire, or be deleted in finally
    }

    // 이중 체크: 락을 잡았더라도, 이전 요청이 이미 성공적으로 처리했을 수 있음
    if (participant.hasSubmitted) {
      ws.send(
        JSON.stringify({ error: "Already submitted for this question." })
      );
      // 이미 제출된 경우, 락을 잡았더라도 더 이상 진행할 필요 없음
      return; // Lock will auto-expire, or be deleted in finally
    }

    const currentQuestionFromSnapshot = questionContent.find(
      (q) => q._id.toString() === questionId
    );
    if (!currentQuestionFromSnapshot) {
      ws.send(JSON.stringify({ error: "Invalid question ID" }));
      return; // Lock will auto-expire, or be deleted in finally
    }

    let isCorrect = false;
    if (answerIndex !== -1) {
      // -1은 답변 안 함을 의미할 수 있음
      isCorrect =
        Number(currentQuestionFromSnapshot.correctAnswer) ===
        Number(answerIndex);
    }

    // 중요: participant 객체에 대한 변경은 Redis에 쓰기 전까지 로컬 메모리에서만 발생
    // 만약 여러 요청이 이 지점까지 동시에 도달했다면 (락이 없었다면),
    // 각각의 요청은 자체 participant 객체 복사본을 수정하게 됨.
    // 마지막 redisJsonSet 호출이 이전 호출의 변경사항을 덮어쓸 위험이 있었음.
    // 락을 사용함으로써, 이 로직 블록은 한 번에 하나의 요청에 대해서만 실행됨.

    participant.responses.push({
      question: currentQuestionFromSnapshot._id,
      answer: answerIndex !== -1 ? answerIndex : null,
      isCorrect: isCorrect,
      responseTime: responseTime, // 서버에서 계산한 응답 시간 사용
    });

    const maxScore = 1000;
    const baseScore = 500;
    const questionTimeLimit = Math.max(
      1,
      currentQuestionFromSnapshot.timeLimit
    ); // 0으로 나누는 것 방지
    const responseTimeInSeconds = responseTime / 1000;

    // 시간 요소 계산 (0과 1 사이 값)
    const timeFactor = Math.max(
      0,
      Math.min(
        1,
        (questionTimeLimit - responseTimeInSeconds) / questionTimeLimit
      )
    );

    if (isCorrect) {
      const score = baseScore + Math.floor((maxScore - baseScore) * timeFactor);
      participant.score += score; // 기존 점수에 추가
      if (currentSession.isTeamMode && currentSession.teams) {
        const team = currentSession.teams.find((t) =>
          t.members.includes(studentId)
        );
        if (team) {
          team.teamScore = (team.teamScore || 0) + score; // 팀 점수도 누적
        }
      }
    }
    participant.hasSubmitted = true;

    // 연결 끊김 상태 동기화 (이 로직은 제출 시점의 연결 상태보다는, 이전의 연결 끊김 이벤트를 반영하기 위함으로 보임)
    // 락 내부에서 Redis를 다시 읽는 것은 피하는 것이 좋으나, 이 로직의 원래 의도가 중요하다면 유지.
    // 여기서는 일단 기존 로직을 유지하되, 락이 이 부분의 동시성 문제는 해결해줌.
    const currentParticipantStateInRedis = await redisJsonGet(participantKey);
    if (
      currentParticipantStateInRedis &&
      currentParticipantStateInRedis.status === "disconnected"
    ) {
      participant.status = "disconnected"; // 만약 이전에 disconnected 되었다면, 제출 데이터에도 반영
    }
    // 최종 참여자 상태를 Redis에 저장
    await redisJsonSet(participantKey, participant, { EX: 3600 });

    // 팀 모드이고 정답을 맞혔다면, 세션의 팀 점수도 업데이트 (팀 점수는 세션 객체에 있음)
    if (currentSession.isTeamMode && isCorrect && currentSession.teams) {
      await redisJsonSet(getSessionKey(pin), currentSession, { EX: 3600 });
    }

    await broadcastToTeacher(pin, {
      type: "studentSubmitted",
      studentId: studentId,
      name: student.name, // Student 모델에서 온 이름
      character: participant.character,
    });

    await _checkAndFinalizeCurrentQuestionIfNeeded(pin, "_handleSubmitAnswer");
  } catch (error) {
    // --- BEGIN MODIFICATION: Catch block for outer try ---
    logger.error(
      `[SubmitAnswer] Error during submission for student ${studentId}, question ${questionId}, PIN ${pin}:`,
      error
    );
    ws.send(JSON.stringify({ error: "An error occurred during submission." }));
    // --- END MODIFICATION ---
  } finally {
    // --- BEGIN MODIFICATION: Release Lock ---
    if (lockAcquired) {
      await redisClient.del(lockKey);
    }
    // --- END MODIFICATION: Release Lock ---
  }
}

// Helper function for 'getTakenCharacters' message
// 학생 클라이언트가 캐릭터 선택 화면에 표시할 이미 선택된 캐릭터 목록을 요청할 때 호출됩니다.
async function _handleGetTakenCharacters(ws, studentId, pin) {
  logger.info(
    `Handling getTakenCharacters for student ${studentId} in session ${pin}`
  );
  const takenCharactersSetKey = getSessionTakenCharactersSetKey(pin);
  const takenCharacterStrings = await redisClient.sMembers(
    takenCharactersSetKey
  ); // 예: ["character1", "character7"]

  const takenCharactersIndices = takenCharacterStrings
    .map((charStr) => {
      const index = parseInt(charStr.replace("character", "")) - 1;
      return isNaN(index) ? -1 : index; // 파싱 실패 시 -1 (또는 다른 방식으로 처리)
    })
    .filter((index) => index !== -1); // 유효한 인덱스만 필터링

  ws.send(
    JSON.stringify({
      type: "takenCharacters",
      // takenCharacters: takenCharacterStrings, // 문자열 배열 그대로 보내거나
      takenCharacters: takenCharactersIndices, // 인덱스 배열로 보내거나 (클라이언트와 협의 필요)
    })
  );
  logger.info(
    `Sent taken characters for PIN ${pin}: Indices [${takenCharactersIndices.join(
      ", "
    )}] from Set ${takenCharactersSetKey}`
  );
}

// 새로운 헬퍼 함수: 학생 연결 종료 시 제출 상태 확인 및 처리
// 학생 웹소켓 연결이 끊어졌을 때 호출됩니다.
// 만약 퀴즈가 진행 중이고, 해당 학생의 연결 끊김으로 인해 모든 활성 참여자가 답을 제출한 상태가 되면
// 다음 문제로 넘어가거나 결과 처리를 진행합니다.
async function _checkSubmissionsOnStudentDisconnect(
  pin,
  disconnectedStudentId
) {
  logger.info(
    `[StudentDisconnect] Processing after student ${disconnectedStudentId} disconnected from PIN: ${pin}.`
  );
  // 공통 헬퍼 함수 호출
  await _checkAndFinalizeCurrentQuestionIfNeeded(
    pin,
    `_checkSubmissionsOnStudentDisconnect (student: ${disconnectedStudentId})`
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

  // kahootClients 초기화 시 subscribedChannels Set도 준비
  if (!kahootClients[pin]) {
    kahootClients[pin] = {
      teacher: null,
      students: {},
      subscribedChannels: new Set(), // Set 초기화
    };
  }
  if (!kahootClients[pin].students) {
    kahootClients[pin].students = {};
  }
  if (!kahootClients[pin].subscribedChannels) {
    // 방어 코드: 혹시 students 객체만 있고 Set이 없다면
    kahootClients[pin].subscribedChannels = new Set();
  }

  kahootClients[pin].students[studentId] = ws;
  logger.info(
    `Student ${studentId} attempting connection to session: ${pin}. Local clients for pin: ${
      Object.keys(kahootClients[pin].students).length
    } students, teacher: ${!!kahootClients[pin].teacher}.`
  );
  setupKeepAlive(ws, pin, "Student");

  // --- BEGIN MODIFICATION: PIN 채널 구독 ---
  try {
    await subscribeToPinChannels(pin); // 해당 PIN의 채널들 구독 시도
  } catch (subError) {
    logger.error(
      `[Connect] Error subscribing to PIN channels for ${pin}, student ${studentId}:`,
      subError
    );
    // 구독 실패가 치명적일 경우 연결을 종료할 수도 있으나, 일단 로깅만 하고 진행
    // ws.send(JSON.stringify({ type: "error", message: "Subscription error. Please try again." }));
    // ws.close();
    // return;
  }
  // --- END MODIFICATION: PIN 채널 구독 ---

  // 초기 연결 시 Redis에서 세션 및 질문 정보 로드 (오류 시 연결 종료)
  const sessionKey = getSessionKey(pin);
  let currentSession;
  try {
    currentSession = await redisJsonGet(sessionKey);
    if (!currentSession) {
      logger.error(
        `[Connect] Session not found in Redis for pin: ${pin} for student ${studentId}. Closing connection.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Session not found. Please try rejoining.",
        })
      );
      ws.close(); // ws.on('close')가 호출되면서 unsubscribe 시도됨
      return;
    }
  } catch (e) {
    logger.error(
      `[Connect] Failed to get session from Redis for pin: ${pin}, student: ${studentId}. Error: ${e.message}. Closing connection.`
    );
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Error fetching session data. Please try rejoining.",
      })
    );
    ws.close();
    return;
  }

  const questionsKey = getSessionQuestionsKey(pin);
  let questionContent;
  try {
    questionContent = await redisJsonGet(questionsKey);
    if (!questionContent) {
      logger.error(
        `[Connect] Questions snapshot not found in Redis for pin: ${pin} for student ${studentId}. Closing connection.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Quiz questions not found for this session.",
        })
      );
      ws.close();
      return;
    }
  } catch (e) {
    logger.error(
      `[Connect] Failed to get questions snapshot from Redis for pin: ${pin}, student: ${studentId}. Error: ${e.message}. Closing connection.`
    );
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Error fetching quiz questions. Please try rejoining.",
      })
    );
    ws.close();
    return;
  }

  const participantKey = getParticipantKey(pin, studentId);
  let participantData = await redisJsonGet(participantKey);

  if (participantData) {
    logger.info(
      `Student ${studentId} is rejoining session ${pin}. Previous status: ${participantData.status}`
    );
    participantData.status = currentSession.isQuestionActive
      ? "connected_waiting"
      : "connected_participating";
    if (
      participantData.status === "connected_participating" &&
      currentSession.isQuestionActive
    ) {
      const currentQId = currentSession.currentQuestionId;
      const lastResponse =
        participantData.responses[participantData.responses.length - 1];
      if (lastResponse && lastResponse.question.toString() === currentQId) {
        participantData.hasSubmitted = true;
      } else {
        participantData.hasSubmitted = false;
      }
    } else {
      participantData.hasSubmitted = false;
    }

    await redisJsonSet(participantKey, participantData, { EX: 3600 });

    if (participantData.character) {
      ws.send(
        JSON.stringify({
          type: "characterAcknowledged",
          character: participantData.character,
          message: "Rejoined session.",
        })
      );
      if (participantData.status === "connected_participating") {
        await broadcastToTeacher(pin, {
          type: "studentJoined",
          studentId: studentId,
          name: participantData.name,
          character: participantData.character,
          isReady: participantData.status === "connected_participating",
        });
      }
    } else {
      logger.warn(
        `Rejoining student ${studentId} in session ${pin} found without character. Treating as new character selection flow.`
      );
    }
  } else {
    logger.info(
      `New student ${studentId} connected to session: ${pin}. Awaiting character selection.`
    );
  }

  // 🎭 사용 가능한 캐릭터 목록과 이미 선택된 캐릭터들을 함께 전송
  if (
    currentSession.availableCharacters &&
    Array.isArray(currentSession.availableCharacters)
  ) {
    const takenCharactersSetKey = getSessionTakenCharactersSetKey(pin);
    const takenCharacterStrings = await redisClient.sMembers(
      takenCharactersSetKey
    );
    const takenCharactersIndices = takenCharacterStrings
      .map((charStr) => {
        const index = parseInt(charStr.replace("character", "")) - 1;
        return isNaN(index) ? -1 : index;
      })
      .filter((index) => index !== -1);

    // 한 번에 보내기
    ws.send(
      JSON.stringify({
        type: "characterData",
        availableCharacters: currentSession.availableCharacters,
        takenCharacters: takenCharactersIndices,
      })
    );

    logger.info(
      `Sent character data to student ${studentId} in session ${pin}: available[${currentSession.availableCharacters.join(
        ", "
      )}], taken[${takenCharactersIndices.join(", ")}]`
    );
  } else {
    logger.warn(
      `No availableCharacters found in session ${pin} for student ${studentId}. Check session initialization.`
    );
  }

  ws.on("close", async () => {
    logger.info(
      `Student WebSocket for student ${studentId} in pin ${pin} closed.`
    );
    if (kahootClients[pin] && kahootClients[pin].students) {
      delete kahootClients[pin].students[studentId];
      logger.info(
        `Student ${studentId} removed from local kahootClients for PIN ${pin}. Remaining students: ${
          Object.keys(kahootClients[pin].students).length
        }`
      );
    }

    try {
      await unsubscribeFromPinChannels(pin);
    } catch (unsubError) {
      logger.error(
        `[Close] Error unsubscribing from PIN channels for ${pin}, student ${studentId}:`,
        unsubError
      );
    }

    const pKey = getParticipantKey(pin, studentId);
    const currentParticipantState = await redisJsonGet(pKey);

    if (currentParticipantState) {
      if (currentParticipantState.status !== "disconnected") {
        currentParticipantState.status = "disconnected";
        await redisJsonSet(pKey, currentParticipantState, { EX: 3600 });
        logger.info(
          `Student ${studentId} in PIN ${pin} data updated to 'disconnected' in Redis via 'close' event.`
        );

        if (
          kahootClients[pin] &&
          kahootClients[pin].teacher &&
          kahootClients[pin].teacher.readyState === WebSocket.OPEN
        ) {
          const studentName = student ? student.name : `Student ${studentId}`;
          await broadcastToTeacher(pin, {
            type: "studentDisconnected",
            studentId: studentId,
            name: studentName,
          });
        }
      }
      await _checkSubmissionsOnStudentDisconnect(pin, studentId);
    } else {
      logger.warn(
        `Participant data for student ${studentId} (pin ${pin}) not found in Redis during ws.on('close'). No status update or submission check needed for game logic.`
      );
    }

    let anyConnectedStudentViaWebSocket = false;
    if (kahootClients[pin] && kahootClients[pin].students) {
      if (Object.keys(kahootClients[pin].students).length > 0) {
        anyConnectedStudentViaWebSocket = true;
      }
    }

    if (!anyConnectedStudentViaWebSocket && kahootClients[pin] === undefined) {
      logger.info(
        `[CloseStudent] kahootClients[${pin}] was deleted by unsubscribe. Assuming no students remaining for this instance.`
      );
    } else if (
      !anyConnectedStudentViaWebSocket &&
      kahootClients[pin] !== undefined
    ) {
      logger.info(
        `[CloseStudent] No active WebSocket connections for students in PIN ${pin} on this instance. Checking Redis for any remaining connected/waiting participants.`
      );
      const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
      let stillConnectedOrWaitingInRedis = false;

      try {
        const allStudentIdsInSession = await redisClient.sMembers(
          studentIdsSetKey
        );

        if (allStudentIdsInSession.length === 0) {
          logger.info(
            `[CloseStudent] No student IDs found in Set for PIN ${pin}. Checking teacher_viewing_results flag.`
          );
          const teacherViewingFlag = await redisClient.get(
            getTeacherViewingResultsFlagKey(pin)
          );
          if (teacherViewingFlag !== "true") {
            // 교사가 결과 보기 중이 아닐 때만 알림
            await broadcastToTeacher(pin, {
              type: "noStudentsRemaining",
              message:
                "모든 학생의 연결이 끊어졌거나 세션을 떠났습니다. 세션을 종료하시겠습니까?",
            });
          } else {
            logger.info(
              `[CloseStudent] Teacher is viewing detailed results for PIN ${pin}, suppressing noStudentsRemaining.`
            );
          }
          return; // 더 이상 진행할 필요 없음
        }

        const participantKeys = allStudentIdsInSession.map((sid) =>
          getParticipantKey(pin, sid)
        );
        const participantDataArray = await redisJsonMGet(participantKeys);

        if (participantDataArray) {
          allStudentIdsInSession.forEach((studentIdForResult, index) => {
            const p = participantDataArray[index];
            if (
              p &&
              (p.status === "connected_participating" ||
                p.status === "connected_waiting")
            ) {
              stillConnectedOrWaitingInRedis = true;
            }
          });
        } else {
          logger.error(
            `[CloseStudent] Failed to get participant data array via MGET for PIN ${pin}, to check for remaining students.`
          );
          return;
        }
      } catch (error) {
        logger.error(
          `[CloseStudent] Error fetching student IDs from Set or MGET participant data from Redis for PIN ${pin} to check for remaining students. Error:`,
          error
        );
        return;
      }

      if (!stillConnectedOrWaitingInRedis) {
        logger.info(
          `[CloseStudent] No students found in 'connected_participating' or 'connected_waiting' state in Redis for PIN ${pin}. Checking teacher_viewing_results flag.`
        );
        const teacherViewingFlag = await redisClient.get(
          getTeacherViewingResultsFlagKey(pin)
        );
        if (teacherViewingFlag !== "true") {
          // 교사가 결과 보기 중이 아닐 때만 알림
          await broadcastToTeacher(pin, {
            type: "noStudentsRemaining",
            message:
              "모든 학생의 연결이 끊어졌거나 세션을 떠났습니다. 세션을 종료하시겠습니까?",
          });
        } else {
          logger.info(
            `[CloseStudent] Teacher is viewing detailed results for PIN ${pin}, suppressing noStudentsRemaining.`
          );
        }
      } else {
        logger.info(
          `[CloseStudent] Found students still in 'connected_participating' or 'connected_waiting' state in Redis for PIN ${pin}.`
        );
      }
    }

    // 실시간 참여자 수 업데이트: 퀴즈가 진행 중일 때만
    const currentSessionOnClose = await redisJsonGet(getSessionKey(pin));
    if (
      currentSessionOnClose &&
      currentSessionOnClose.quizStarted &&
      !currentSessionOnClose.quizEndedByTeacher
    ) {
      const activeStudentCount = await getActiveStudentCount(pin);
      await broadcastToTeacher(pin, {
        type: "activeStudentCountUpdated",
        activeStudentCount: activeStudentCount,
      });
      logger.info(
        `Notified teacher of updated active student count (${activeStudentCount}) for PIN ${pin} after disconnect.`
      );
    }

    // 학생 퇴장 후 남은 학생들이 모두 제출했는지 확인
    await _checkSubmissionsOnStudentDisconnect(pin, studentId);
  });

  ws.on("error", async (error) => {
    logger.error(
      `WebSocket error on student ${studentId} connection for pin ${pin}: ${error.message}. Terminating connection.`
    );
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.terminate(); // 'close' 이벤트 핸들러가 호출될 것임
    }
  });

  ws.on("message", async (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
      logger.info(
        `Received message from student ${studentId} (PIN ${pin}): ${JSON.stringify(
          parsedMessage
        )}`
      );
    } catch (e) {
      logger.error(
        `Failed to parse message from student ${studentId} (PIN ${pin}): ${message}. Error: ${e.message}. Closing connection.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format received. Disconnecting.",
        })
      );
      ws.close();
      return;
    }

    let currentSessionState;
    try {
      currentSessionState = await redisJsonGet(getSessionKey(pin));
      if (!currentSessionState) {
        logger.error(
          `[Message] Session ${pin} metadata not found in Redis for student ${studentId} during message processing for type: ${parsedMessage.type}. Closing connection.`
        );
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Session data lost. Please try rejoining.",
          })
        );
        ws.close();
        return;
      }
    } catch (e) {
      logger.error(
        `[Message] Failed to get session from Redis for pin: ${pin}, student: ${studentId}, type: ${parsedMessage.type}. Error: ${e.message}. Closing connection.`
      );
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Error fetching session data. Please try rejoining.",
        })
      );
      ws.close();
      return;
    }

    let currentQuestionContent;
    if (parsedMessage.type === "submitAnswer") {
      try {
        currentQuestionContent = await redisJsonGet(
          getSessionQuestionsKey(pin)
        );
        if (!currentQuestionContent) {
          logger.error(
            `[Message] Quiz questions for session ${pin} not found in Redis for student ${studentId} when submitting answer. Closing connection.`
          );
          ws.send(
            JSON.stringify({
              type: "error",
              message:
                "Quiz questions data lost. Cannot submit answer. Please try rejoining.",
            })
          );
          ws.close();
          return;
        }
      } catch (e) {
        logger.error(
          `[Message] Failed to get questions from Redis for pin: ${pin}, student: ${studentId}, (submitAnswer). Error: ${e.message}. Closing connection.`
        );
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Error fetching quiz questions. Please try rejoining.",
          })
        );
        ws.close();
        return;
      }
    }

    try {
      switch (parsedMessage.type) {
        case "characterSelected":
          await _handleCharacterSelected(
            ws,
            studentId,
            pin,
            parsedMessage,
            currentSessionState,
            student
          );
          break;
        case "submitAnswer":
          if (!currentQuestionContent) {
            logger.error(
              `[Message] Critical: currentQuestionContent is null for submitAnswer despite earlier checks. Student: ${studentId}, PIN: ${pin}. Closing connection.`
            );
            ws.send(
              JSON.stringify({
                type: "error",
                message:
                  "Internal server error processing answer. Please rejoin.",
              })
            );
            ws.close();
            return;
          }
          await _handleSubmitAnswer(
            ws,
            studentId,
            pin,
            parsedMessage,
            currentSessionState,
            student,
            currentQuestionContent
          );
          break;
        case "getTakenCharacters":
          await _handleGetTakenCharacters(ws, studentId, pin);
          break;
        default:
          logger.warn(
            `Unknown message type: ${parsedMessage.type} from student ${studentId} in pin ${pin}.`
          );
      }
    } catch (error) {
      logger.error(
        `Critical error in student message handler for type ${parsedMessage.type} (pin: ${pin}, student: ${studentId}):`,
        error
      );
      try {
        ws.send(
          JSON.stringify({
            type: "error",
            message:
              "A critical error occurred while processing your request. Disconnecting.",
          })
        );
      } catch (sendError) {
        logger.error(
          `Failed to send error message to student ${studentId} (PIN: ${pin}) before closing due to critical handler error:`,
          sendError
        );
      }
      ws.close();
    }
  });
};
