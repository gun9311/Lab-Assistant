const { redisClient, subscriberClient } = require("../utils/redisClient");
const logger = require("../utils/logger");
const WebSocket = require("ws");
const {
  getParticipantKey,
  getSessionKey,
  // getRedisChannelPatternAllSessionMessages, // 더 이상 사용하지 않음
  getRedisChannelBroadcastToStudents,
  getRedisChannelBroadcastToActiveStudents,
  getRedisChannelBroadcastToTeacher,
  getRedisChannelIndividualFeedbackList,
  getSessionStudentIdsSetKey,
  getRedisChannelForceCloseStudents,
} = require("../utils/redisKeys");
const { redisJsonGet, redisJsonMGet } = require("../utils/redisUtils");

const kahootClients = {}; // 각 세션의 로컬 클라이언트를 저장하는 객체
// kahootClients[pin] = {
//   teacher: ws,
//   students: { studentId: ws, ... },
//   subscribedChannels: new Set() // 해당 PIN에 대해 이 인스턴스가 구독 중인 채널 목록
// };

const PING_INTERVAL_MS = 10000; // 핑 주기 (10초)
const PONG_TIMEOUT_MS = 5000; // 퐁 타임아웃 (5초)

// Pub/Sub 메시지 처리 핸들러 (내용은 거의 동일, 호출 방식만 변경됨)
const handlePubSubMessage = async (message, channel) => {
  try {
    logger.info(`Received Pub/Sub message on channel ${channel}: ${message}`);
    const rawMessageData = JSON.parse(message);
    // 채널 이름에서 PIN 추출 (예: "session:PIN:pubsub:type" -> "PIN")
    // 또는 패턴 구독 시 message 객체에 channel 정보가 함께 올 수 있음 (라이브러리 확인 필요)
    // 여기서는 채널 문자열을 직접 파싱한다고 가정
    const pin = channel.split(":")[1];

    if (!kahootClients[pin]) {
      // 이 인스턴스에는 해당 PIN의 세션 정보가 로컬에 없음 (구독 해지 로직이 제대로 동작했다면 발생하지 않아야 함)
      logger.warn(
        `[PubSub] Received message for PIN ${pin} on channel ${channel}, but no local clients found. Ignoring.`
      );
      return;
    }

    // 기존 메시지 타입별 처리 로직 (broadcast_students, broadcast_teacher, broadcast_active_students, individual_feedback_list)
    // ... 기존 handlePubSubMessage의 if/else if 로직 ...
    if (channel.endsWith(":broadcast_students")) {
      if (kahootClients[pin].students) {
        Object.values(kahootClients[pin].students).forEach((studentWs) => {
          if (studentWs.readyState === WebSocket.OPEN) {
            studentWs.send(JSON.stringify(rawMessageData));
          }
        });
      }
    } else if (channel.endsWith(":broadcast_teacher")) {
      // --- 5초 전 알림 타이머 정리 (모든 학생 제출 시) ---
      if (
        kahootClients[pin] &&
        rawMessageData.type === "allStudentsSubmitted"
      ) {
        if (kahootClients[pin].timeLeftTimeoutId) {
          clearTimeout(kahootClients[pin].timeLeftTimeoutId);
          kahootClients[pin].timeLeftTimeoutId = null;
          logger.info(
            `[PubSub] Cleared 'timeLeft' timeout for PIN: ${pin} due to all students submitting.`
          );
        }
      }
      // ---

      if (
        kahootClients[pin].teacher &&
        kahootClients[pin].teacher.readyState === WebSocket.OPEN
      ) {
        kahootClients[pin].teacher.send(JSON.stringify(rawMessageData));
      }
    } else if (channel.endsWith(":broadcast_active_students")) {
      const { originalMessage, activeStudentIds } = rawMessageData;
      if (
        kahootClients[pin].students &&
        activeStudentIds &&
        Array.isArray(activeStudentIds)
      ) {
        activeStudentIds.forEach((studentId) => {
          const studentWs = kahootClients[pin].students[studentId];
          if (studentWs && studentWs.readyState === WebSocket.OPEN) {
            studentWs.send(JSON.stringify(originalMessage));
          }
        });
      }
    } else if (channel.endsWith(":individual_feedback_list")) {
      if (kahootClients[pin].students && Array.isArray(rawMessageData)) {
        rawMessageData.forEach((item) => {
          const { studentId, feedbackPayload } = item;
          const studentWs = kahootClients[pin].students[studentId];
          if (studentWs && studentWs.readyState === WebSocket.OPEN) {
            studentWs.send(JSON.stringify(feedbackPayload));
          }
        });
      }
    } else if (channel.endsWith(":force_close_students")) {
      if (kahootClients[pin] && kahootClients[pin].students) {
        logger.info(
          `[PubSub-ForceClose] Received force_close_students for PIN ${pin}. Closing student sockets.`
        );
        const closeReason =
          rawMessageData.reason ||
          "Session ended by teacher for viewing results.";
        const notificationMessage =
          rawMessageData.notification ||
          "퀴즈가 곧 종료됩니다. 교사가 상세 결과를 확인 중입니다.";

        Object.values(kahootClients[pin].students).forEach((studentWs) => {
          if (studentWs.readyState === WebSocket.OPEN) {
            try {
              studentWs.send(
                JSON.stringify({
                  type: "sessionForceClosed",
                  message: notificationMessage,
                })
              );
              studentWs.close(1000, closeReason);
            } catch (e) {
              logger.warn(
                `[PubSub-ForceClose] Error sending close message or closing student WebSocket for PIN ${pin}: ${e.message}. Terminating.`
              );
              studentWs.terminate();
            }
          }
        });
      }
    }
    // ... 기존 로직 끝 ...
  } catch (error) {
    logger.error(
      `Error processing Pub/Sub message on channel ${channel}:`,
      error
    );
  }
};

// Pub/Sub 초기화 함수 (와일드카드 구독 제거)
const initializeKahootPubSub = async () => {
  try {
    // 기존의 pSubscribe는 제거합니다.
    // await subscriberClient.pSubscribe(
    //   getRedisChannelPatternAllSessionMessages(),
    //   handlePubSubMessage
    // );
    // logger.info(
    //   `Subscribed to Redis Pub/Sub channel pattern: ${getRedisChannelPatternAllSessionMessages()}`
    // );

    // 대신, subscriberClient가 메시지를 수신할 준비가 되었음을 로깅할 수 있습니다.
    // 실제 구독은 각 PIN별로 동적으로 이루어집니다.
    // node-redis v4의 경우, .on('message', ...) 리스너를 설정하는 방식 대신,
    // subscribe/pSubscribe 호출 시 콜백을 전달하는 것이 일반적입니다.
    // 또는 client.on('message', (channel, message) => { ... }) 와 같은 일반 리스너를 사용할 수도 있습니다.
    // 여기서는 subscribe 호출 시 콜백을 전달하는 방식을 가정합니다.
    // 만약 client.on('message', ...)를 사용한다면 여기서 설정.

    // 예시: subscriberClient.on('message', handlePubSubMessage); // 모든 구독 채널에 대한 메시지 핸들러
    // (주의: node-redis v4에서는 subscribe 시 콜백 전달이 일반적, on('message')는 구버전 스타일이거나 다른 용도일 수 있음)
    // 정확한 사용법은 node-redis v4 문서 확인 필요.
    // 여기서는 각 subscribe 호출 시 handlePubSubMessage 콜백을 전달한다고 가정하고 진행.

    logger.info(
      "Kahoot Pub/Sub listener initialized. Awaiting dynamic subscriptions."
    );
  } catch (error) {
    logger.error("Failed to initialize Kahoot Pub/Sub listener:", error);
  }
};

const getChannelsForPin = (pin) => {
  return [
    getRedisChannelBroadcastToStudents(pin),
    getRedisChannelBroadcastToActiveStudents(pin),
    getRedisChannelBroadcastToTeacher(pin),
    getRedisChannelIndividualFeedbackList(pin),
    getRedisChannelForceCloseStudents(pin),
    // 필요한 다른 PIN 특정 채널 추가 가능
  ];
};

const subscribeToPinChannels = async (pin) => {
  if (!kahootClients[pin]) {
    // 이것은 호출하는 쪽(예: 웹소켓 핸들러)에서 kahootClients[pin] 객체를 먼저 생성한 후 호출해야 함
    logger.error(
      `[Sub] Cannot subscribe. kahootClients[${pin}] is not initialized.`
    );
    return;
  }
  if (!kahootClients[pin].subscribedChannels) {
    kahootClients[pin].subscribedChannels = new Set();
  }

  const channelsToSubscribe = getChannelsForPin(pin);
  let subscribedCount = 0;

  for (const channel of channelsToSubscribe) {
    if (!kahootClients[pin].subscribedChannels.has(channel)) {
      try {
        // node-redis v4에서는 subscribe 메서드에 콜백 함수를 전달합니다.
        await subscriberClient.subscribe(channel, handlePubSubMessage);
        kahootClients[pin].subscribedChannels.add(channel);
        subscribedCount++;
        logger.info(`[Sub] Subscribed to channel: ${channel} for PIN: ${pin}`);
      } catch (error) {
        logger.error(
          `[Sub] Failed to subscribe to channel ${channel} for PIN ${pin}:`,
          error
        );
      }
    }
  }
  if (subscribedCount > 0) {
    logger.info(
      `[Sub] Finished subscribing to ${subscribedCount} new channels for PIN: ${pin}. Total subscribed for PIN: ${kahootClients[pin].subscribedChannels.size}`
    );
  }
};

const unsubscribeFromPinChannels = async (pin) => {
  const clientPinData = kahootClients[pin]; // 함수 시작 시점에 참조를 가져옴

  if (!clientPinData) {
    logger.info(
      `[Unsub] kahootClients[${pin}] does not exist at the beginning. No action needed.`
    );
    return;
  }

  const subscribedChannelsSet = clientPinData.subscribedChannels;

  // subscribedChannelsSet이 Set 객체가 아니거나, Set이 비어있으면 구독 해지 작업을 진행하지 않음
  if (
    !(subscribedChannelsSet instanceof Set) ||
    subscribedChannelsSet.size === 0
  ) {
    logger.info(
      `[Unsub] No channels to unsubscribe from for PIN: ${pin}. 'subscribedChannels' is not a non-empty Set.`
    );
    return;
  }

  // 해당 PIN에 더 이상 활성 웹소켓 연결이 없는지 확인 (교사 및 학생 모두)
  const hasActiveTeacher = !!clientPinData.teacher;
  const hasActiveStudents =
    clientPinData.students && Object.keys(clientPinData.students).length > 0;

  if (hasActiveTeacher || hasActiveStudents) {
    logger.info(
      `[Unsub] PIN ${pin} still has active connections. Skipping unsubscribe. Teacher: ${hasActiveTeacher}, Students: ${
        Object.keys(clientPinData.students || {}).length
      }`
    );
    return;
  }

  logger.info(
    `[Unsub] No active connections for PIN ${pin}. Proceeding to unsubscribe from ${subscribedChannelsSet.size} channels.`
  );
  let unsubscribedCount = 0;
  // Array.from을 사용하여 Set의 현재 상태를 복사하여 반복 (Set이 반복 중 변경되어도 안전)
  const channelsToUnsubscribe = Array.from(subscribedChannelsSet);

  for (const channel of channelsToUnsubscribe) {
    try {
      await subscriberClient.unsubscribe(channel);
      // clientPinData.subscribedChannels (즉, subscribedChannelsSet)에서 삭제
      // 이 시점에도 clientPinData가 여전히 kahootClients[pin]과 동일하다는 보장은 없지만,
      // subscribedChannelsSet은 초기에 가져온 참조이므로, 해당 Set에서 삭제하는 것은 안전함.
      // 만약 kahootClients[pin].subscribedChannels를 직접 수정해야 한다면, 다시 한 번 kahootClients[pin] 존재 유무 및
      // subscribedChannels의 존재 유무를 확인해야 하지만, 여기서는 로컬 Set을 수정.
      // 이 로컬 Set (subscribedChannelsSet)의 변경이 실제 kahootClients[pin].subscribedChannels에 반영되려면
      // subscribedChannelsSet이 실제 객체 참조여야 함 (현재 코드는 그렇게 되어 있음).
      if (clientPinData.subscribedChannels instanceof Set) {
        // 다시 한번 확인 후 삭제
        clientPinData.subscribedChannels.delete(channel);
      }
      unsubscribedCount++;
      logger.info(
        `[Unsub] Unsubscribed from channel: ${channel} for PIN: ${pin}`
      );
    } catch (error) {
      logger.error(
        `[Unsub] Failed to unsubscribe from channel ${channel} for PIN ${pin}:`,
        error
      );
    }
  }

  if (unsubscribedCount > 0) {
    logger.info(
      `[Unsub] Finished unsubscribing from ${unsubscribedCount} channels for PIN: ${pin}. Remaining in clientPinData.subscribedChannels: ${
        clientPinData.subscribedChannels
          ? clientPinData.subscribedChannels.size
          : "N/A"
      }`
    );
  }

  // 모든 채널 구독 해지 시도 후, subscribedChannelsSet이 비어있고 (이것은 clientPinData.subscribedChannels를 봐야함)
  // 연결도 없다면 kahootClients[pin] 자체를 정리.
  // 여기서 다시 한번 kahootClients[pin]의 현재 상태를 확인하여 삭제 여부 결정
  const currentSubscribedChannels = kahootClients[pin]
    ? kahootClients[pin].subscribedChannels
    : undefined;
  if (
    currentSubscribedChannels instanceof Set &&
    currentSubscribedChannels.size === 0 && // 실제 전역 객체의 Set이 비었고
    !hasActiveTeacher &&
    !hasActiveStudents && // (초기 판단) 활성 연결도 없었고
    kahootClients[pin] === clientPinData // 그리고 kahootClients[pin]이 그 사이에 다른 객체로 바뀌거나 하지 않았다면
  ) {
    logger.info(
      `[Unsub] All channels unsubscribed and no active connections for PIN ${pin}. Cleaning up kahootClients[${pin}] (final check).`
    );
    delete kahootClients[pin]; // 실제 전역 객체에서 삭제
  } else if (kahootClients[pin] !== clientPinData) {
    logger.warn(
      `[Unsub] kahootClients[${pin}] was changed during unsubscribe operation. Local cleanup might be partial.`
    );
  } else if (
    currentSubscribedChannels instanceof Set &&
    currentSubscribedChannels.size > 0
  ) {
    logger.info(
      `[Unsub] PIN ${pin} still has ${currentSubscribedChannels.size} subscribed channels. Not cleaning up kahootClients[${pin}].`
    );
  }
};

// 새로운 헬퍼 함수: 활성 학생 수 계산
async function getActiveStudentCount(pin) {
  try {
    const studentIdsSetKey = getSessionStudentIdsSetKey(pin);
    const allStudentIdsInSession = await redisClient.sMembers(studentIdsSetKey);

    if (!allStudentIdsInSession || allStudentIdsInSession.length === 0) {
      return 0;
    }

    const participantKeys = allStudentIdsInSession.map((studentId) =>
      getParticipantKey(pin, studentId)
    );
    const participantDataArray = await redisJsonMGet(participantKeys);

    if (!participantDataArray) {
      logger.warn(
        `MGET for participant keys returned null for PIN ${pin}. Assuming 0 active students.`
      );
      return 0;
    }

    const activeStudentCount = participantDataArray.reduce((count, pData) => {
      if (pData && pData.status === "connected_participating") {
        return count + 1;
      }
      return count;
    }, 0);

    return activeStudentCount;
  } catch (error) {
    logger.error(`Error in getActiveStudentCount for PIN ${pin}:`, error);
    return 0; // 오류 발생 시 0 반환
  }
}

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

// 특정 핀(pin)으로 세션에 연결된 교사에게 메시지 발행
const broadcastToTeacher = async (pin, message) => {
  const channel = getRedisChannelBroadcastToTeacher(pin);
  try {
    await redisClient.publish(channel, JSON.stringify(message));
    logger.info(
      `Message published to teacher channel ${channel}: ${JSON.stringify(
        message
      )}`
    );
  } catch (error) {
    logger.error(`Failed to publish to teacher channel ${channel}:`, error);
  }
};

// 특정 핀(pin)으로 세션에 연결된 학생들에게 메시지 발행
const broadcastToStudents = async (pin, message) => {
  const channel = getRedisChannelBroadcastToStudents(pin);
  try {
    await redisClient.publish(channel, JSON.stringify(message));
    logger.info(
      `Message published to students channel ${channel}: ${JSON.stringify(
        message
      )}`
    );
  } catch (error) {
    logger.error(`Failed to publish to students channel ${channel}:`, error);
  }
};

// 특정 핀(pin)으로 세션에 연결된 활성 학생들에게 메시지 발행
const broadcastToActiveStudents = async (
  pin,
  message,
  targetStudentIds = null // Optional: 특정 학생 ID 배열
) => {
  const channel = getRedisChannelBroadcastToActiveStudents(pin);
  try {
    let studentIdsToSendTo = targetStudentIds;

    // targetStudentIds가 제공되지 않은 경우에만, 모든 활성 학생을 조회합니다.
    if (!studentIdsToSendTo) {
      const studentIdsInSessionKey = getSessionStudentIdsSetKey(pin);
      const allStudentIdsInSession = await redisClient.sMembers(
        studentIdsInSessionKey
      );

      if (!allStudentIdsInSession || allStudentIdsInSession.length === 0) {
        logger.info(
          `No students found in set ${studentIdsInSessionKey} for pin ${pin}. Not publishing to active students.`
        );
        return;
      }

      const participantKeys = allStudentIdsInSession.map((studentId) =>
        getParticipantKey(pin, studentId)
      );
      const participantDataArray = await redisJsonMGet(participantKeys);
      const activeStudentIds = [];
      if (participantDataArray) {
        allStudentIdsInSession.forEach((studentId, index) => {
          const participantData = participantDataArray[index];
          if (
            participantData &&
            participantData.status === "connected_participating"
          ) {
            activeStudentIds.push(studentId);
          }
        });
      }
      studentIdsToSendTo = activeStudentIds;
    }

    if (!studentIdsToSendTo || studentIdsToSendTo.length === 0) {
      const reason = targetStudentIds
        ? "provided target list was empty"
        : "no students with status 'connected_participating' found";
      logger.info(
        `Not publishing to active students for pin ${pin}. Reason: ${reason}.`
      );
      return;
    }

    const payload = {
      originalMessage: message,
      activeStudentIds: studentIdsToSendTo,
    };

    await redisClient.publish(channel, JSON.stringify(payload));
    logger.info(
      `Message published to active students channel ${channel} for ${
        studentIdsToSendTo.length
      } students: ${JSON.stringify(payload)}`
    );
  } catch (error) {
    logger.error(
      `Failed to publish to active students channel ${channel}:`,
      error
    );
  }
};

// 학생별 개별 피드백 목록을 발행하는 함수
const publishIndividualFeedbackList = async (pin, feedbackList) => {
  const channel = getRedisChannelIndividualFeedbackList(pin);
  try {
    await redisClient.publish(channel, JSON.stringify(feedbackList));
    logger.info(
      `Individual feedback list published to channel ${channel} for ${feedbackList.length} students.`
    );
  } catch (error) {
    logger.error(
      `Failed to publish individual feedback list to channel ${channel}:`,
      error
    );
  }
};

// 웹소켓 연결 유지 (Keep-Alive) 로직
function setupKeepAlive(ws, pin, clientType) {
  let isAlive = true;
  let pongTimeout;

  ws.on("pong", () => {
    isAlive = true;
    clearTimeout(pongTimeout);
  });

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!isAlive) {
        logger.warn(
          `${clientType} connection for pin ${pin} did not respond to ping, terminating connection.`
        );
        ws.terminate(); // 연결 종료
        clearInterval(pingInterval); // 인터벌 정리
        clearTimeout(pongTimeout); // 타임아웃 정리
        return;
      }
      isAlive = false;
      ws.ping();

      pongTimeout = setTimeout(() => {
        if (!isAlive) {
          logger.warn(
            `${clientType} connection for pin ${pin} did not respond to pong within ${
              PONG_TIMEOUT_MS / 1000
            } seconds, terminating connection.`
          );
          ws.terminate(); // 연결 종료
          clearInterval(pingInterval); // 인터벌 정리
        }
      }, PONG_TIMEOUT_MS);
    } else {
      clearInterval(pingInterval);
      clearTimeout(pongTimeout);
    }
  }, PING_INTERVAL_MS);

  ws.on("close", () => {
    clearInterval(pingInterval);
    clearTimeout(pongTimeout);
    logger.info(
      `${clientType} connection for pin ${pin} closed. Keep-alive stopped.`
    );
  });

  ws.on("error", (error) => {
    clearInterval(pingInterval);
    clearTimeout(pongTimeout);
    logger.error(
      `${clientType} connection error for pin ${pin}: ${error}. Keep-alive stopped.`
    );
  });

  return pingInterval;
}

module.exports = {
  kahootClients,
  initializeKahootPubSub,
  broadcastToTeacher,
  broadcastToStudents,
  broadcastToActiveStudents,
  publishIndividualFeedbackList,
  setupKeepAlive,
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  subscribeToPinChannels, // 새로 추가된 함수
  unsubscribeFromPinChannels, // 새로 추가된 함수
  getActiveStudentCount,
  handleAllSubmissionsProcessing,
};
