const { v4: uuidv4 } = require("uuid");
const { getNLPResponse } = require("../services/nlpService");
const { redisClient } = require("../utils/redisClient");
const logger = require("../utils/logger");
const config = require("../config");
const chatUsageService = require("../services/chatUsageService");
const { preprocessUserMessage } = require("../services/chatbotMessageService"); // 수정: chatbotMessageService에서 함수 가져오기
const chatbotInteractionService = require("../services/chatbotInteractionService"); // 수정: chatbotInteractionService 가져오기
const chatSummaryService = require("../services/chatSummaryService"); // 추가: chatSummaryService 가져오기

// p-limit을 동적으로 import 하기 위한 즉시 실행 비동기 함수 (IIFE)
let pLimit;
(async () => {
  const pLimitModule = await import("p-limit");
  pLimit = pLimitModule.default;
})();

let dbWriteLimit; // 선언만 하고

// initializeChatConnection 함수 또는 이 모듈이 처음 사용될 때 dbWriteLimit 초기화
async function initializeDbWriteLimit() {
  if (!pLimit) {
    const pLimitModule = await import("p-limit");
    pLimit = pLimitModule.default;
  }
  if (!dbWriteLimit && pLimit) {
    // pLimit이 로드되었고 dbWriteLimit이 아직 초기화되지 않았다면
    dbWriteLimit = pLimit(7); // 예시: 동시성 7
    logger.info("[ChatbotHandler] dbWriteLimit initialized.");
  }
}

let clients = {};

const { RECENT_HISTORY_COUNT } = config.chatLimits;

// --- queueChatSummarySave 함수 수정 ---
async function queueChatSummarySave(userId, subject, chatHistoryToSave) {
  await initializeDbWriteLimit(); // dbWriteLimit 사용 전에 초기화 보장
  if (!dbWriteLimit) {
    logger.error(
      "[ChatbotHandler] dbWriteLimit is not initialized. Cannot queue chat summary save."
    );
    return; // 또는 에러 throw
  }
  if (chatHistoryToSave && chatHistoryToSave.length > 0) {
    logger.info(
      `[ChatbotHandler] Queueing chat summary save for user ${userId}, subject ${subject}. History length: ${chatHistoryToSave.length}. Pending tasks: ${dbWriteLimit.pendingCount}`
    );
    // 수정: chatSummaryService.saveChatSummary 호출
    dbWriteLimit(() =>
      chatSummaryService.saveChatSummary(userId, subject, chatHistoryToSave)
    )
      .then(() => {
        logger.debug(
          `[ChatbotHandler] DB write task (chat summary) completed for user ${userId}, subject ${subject}.`
        );
      })
      .catch((error) => {
        // chatSummaryService.saveChatSummary 내부에서 에러를 throw하지 않으면 이 catch는 dbWriteLimit 자체의 오류만 잡게 됨.
        // chatSummaryService에서 로깅하므로 여기서는 간단히 로깅하거나, 서비스에서 throw된 에러를 잡도록 할 수 있음.
        logger.error(
          `[ChatbotHandler] DB write task (chat summary) failed after being queued for user ${userId}, subject ${subject}:`,
          { message: error?.message }
        );
      });
  } else {
    logger.info(
      `[ChatbotHandler] No chat history for user ${userId}, subject ${subject}, skipping save task.`
    );
  }
}

const initializeChatConnection = async (ws, userId, subjectParam) => {
  await initializeDbWriteLimit(); // 핸들러 시작 시 dbWriteLimit 초기화 보장
  const chatHistoryKey = `chatHistories:${userId}`;
  const clientId = uuidv4();
  clients[clientId] = ws;
  logger.info(
    `Chat client connected: ${clientId} for user ${userId}, subject: ${subjectParam}. Total: ${
      Object.keys(clients).length
    }.`
  );

  let initialRecentHistory = [];
  try {
    const recentHistoryFromRedis = await redisClient.get(chatHistoryKey);
    if (recentHistoryFromRedis) {
      initialRecentHistory = JSON.parse(recentHistoryFromRedis);
      if (!Array.isArray(initialRecentHistory)) {
        logger.warn(
          `Invalid recent history format from Redis for user ${userId}, resetting.`
        );
        initialRecentHistory = [];
      }
    }
  } catch (parseOrRedisError) {
    logger.error(
      `Error reading/parsing chat history from Redis for user ${userId}:`,
      parseOrRedisError
    );
    initialRecentHistory = [];
  }

  let chatHistory = initialRecentHistory;

  let isAlive = true;
  ws.on("pong", () => {
    isAlive = true;
  });

  const pingInterval = setInterval(async () => {
    if (ws.readyState === ws.OPEN) {
      if (!isAlive) {
        logger.warn(
          `Client ${clientId} did not respond to ping, terminating connection`
        );
        await handleDisconnection(
          userId,
          subjectParam,
          clientId,
          ws,
          chatHistory
        );
      } else {
        isAlive = false;
        ws.ping();
        logger.info(`Ping sent to client ${clientId}`);
      }
    }
  }, 60000);

  const initialUsageCheck = await chatUsageService.checkAndUpdateUsageOnInit(
    userId
  );
  if (!initialUsageCheck.allow) {
    let errorMessage = "사용량 제한을 초과했습니다.";
    if (initialUsageCheck.errorType === "daily_limit_exceeded") {
      errorMessage = "오늘의 채팅 사용량을 모두 사용했어요.";
      ws.send(
        JSON.stringify({ error: "daily_limit_exceeded", message: errorMessage })
      );
    } else if (initialUsageCheck.errorType === "monthly_limit_exceeded") {
      errorMessage = "이번 달 채팅 사용량을 모두 사용했어요.";
      ws.send(
        JSON.stringify({
          error: "monthly_limit_exceeded",
          message: errorMessage,
        })
      );
    } else if (initialUsageCheck.errorType === "user_not_found") {
      ws.send(JSON.stringify({ error: "사용자 정보를 찾을 수 없습니다." }));
    } else {
      // usage_check_error 또는 기타
      ws.send(
        JSON.stringify({
          error: "usage_check_error",
          message: "사용량 확인 중 오류가 발생했습니다.",
        })
      );
    }
    logger.warn(
      `[ChatbotCtrl] User ${userId} disconnected due to initial usage limit: ${initialUsageCheck.errorType}`
    );
    ws.close();
    clearInterval(pingInterval);
    delete clients[clientId];
    logger.info(
      `Chat client ${clientId} (User: ${userId}) removed after initial usage check. Remaining: ${
        Object.keys(clients).length
      }.`
    );
    return;
  }
  logger.info(
    `[ChatbotCtrl] Initial usage check passed for user ${userId}. Daily: ${initialUsageCheck.dailyCount}, Monthly: ${initialUsageCheck.monthlyCount}`
  );

  ws.on("message", async (message) => {
    const startTime = process.hrtime();
    let saveToHistory = true;

    try {
      const {
        grade,
        semester,
        subject,
        unit,
        topic,
        userMessage: rawUserMessage,
      } = JSON.parse(message);

      if (!rawUserMessage || !rawUserMessage.trim()) {
        saveToHistory = false;
        logger.info(
          `Initial or empty message received from user ${userId}, usage count not incremented.`
        );

        // 수정: 초기 NLP 요청 메시지 구성 서비스 함수 호출
        const messagesForNLP =
          chatbotInteractionService.constructInitialNLPRequestMessages(
            grade,
            subject,
            unit,
            topic
          );

        const streamResponse = getNLPResponse(
          messagesForNLP.systemPrompt,
          messagesForNLP.userMessages
        );
        let botResponseContent = ""; // rawBotResponseContent 대신 botResponseContent로 통일
        for await (const botResp of streamResponse) {
          // 변수명 변경 botResponse -> botResp
          ws.send(JSON.stringify({ bot: botResp, isFinal: false }));
          botResponseContent += botResp;
        }
        ws.send(JSON.stringify({ bot: null, isFinal: true }));

        // (초기 메시지에 대한 후처리는 필요시 chatbotMessageService.postprocessBotResponse 호출)
        // const finalBotResponse = await chatbotMessageService.postprocessBotResponse(botResponseContent, userId, clientId);
        // ws.send로 이미 전송했으므로, 후처리된 finalBotResponse를 다시 보내지는 않음.
        // 히스토리에 저장하지 않으므로 이 단계에서는 추가 작업 불필요.

        return;
      }

      const usageUpdateResult =
        await chatUsageService.incrementAndCheckUsageOnMessage(userId);
      if (!usageUpdateResult.success) {
        // ... (사용량 제한 초과 처리) ...
        return;
      }
      logger.info(`[ChatbotCtrl] Usage count updated for user ${userId}.`);

      const {
        processedMessage: messageForProcessing,
        finalUserMessageForHistory,
        isFiltered: userMessageIsFiltered,
        refusalResponse: userMessageRefusalResponse,
        // filterDetails: userMessageFilterDetails // 이 변수는 현재 사용되지 않으므로 생략 가능
      } = await preprocessUserMessage(rawUserMessage, userId, clientId); // chatbotMessageService의 함수

      if (userMessageIsFiltered) {
        // 사용자 메시지가 필터링된 경우, 거절 응답을 클라이언트에게 전송
        ws.send(
          JSON.stringify({
            bot: userMessageRefusalResponse, // 거절 메시지를 bot 필드에 담아 전송
            isFinal: true, // 단일 메시지이므로 isFinal: true
            // 여기에 추가적으로 filterDetails 같은 정보를 포함시켜 클라이언트에서 활용할 수도 있습니다.
            // 예: filterType: userMessageFilterDetails?.type
          })
        );

        // 히스토리 저장 시 chatbotInteractionService.saveToChatHistory 사용
        await chatbotInteractionService.saveToChatHistory(
          chatHistoryKey,
          chatHistory,
          finalUserMessageForHistory,
          userMessageRefusalResponse,
          userId
        );
        logger.info(
          `Sent refusal response and saved filtered interaction to Redis for user ${userId}`
        );
        return; // 여기서 함수가 종료됨
      }

      const recentHistory = chatHistory.slice(-RECENT_HISTORY_COUNT);
      // 수정: NLP 요청 메시지 구성 서비스 함수 호출
      const messagesForNLP =
        chatbotInteractionService.constructNLPRequestMessages(
          grade,
          subject,
          unit,
          topic,
          recentHistory,
          messageForProcessing
        );

      // getNLPResponse 호출을 새로운 시그니처에 맞게 수정
      const streamResponse = getNLPResponse(
        messagesForNLP.systemPrompt,
        messagesForNLP.userMessages
      );
      let rawBotResponseContent = "";
      for await (const botResp of streamResponse) {
        // 변수명 변경 botresponse -> botResp
        ws.send(JSON.stringify({ bot: botResp, isFinal: false }));
        rawBotResponseContent += botResp;
      }
      ws.send(JSON.stringify({ bot: null, isFinal: true }));

      if (saveToHistory) {
        // saveToHistory는 true일 것 (빈 메시지가 아니므로)
        // 수정: 히스토리 저장 서비스 함수 호출
        await chatbotInteractionService.saveToChatHistory(
          chatHistoryKey,
          chatHistory,
          finalUserMessageForHistory,
          rawBotResponseContent, // Claude 원본 응답을 히스토리에 저장
          userId
        );
      }
    } catch (error) {
      logger.error(
        `[chatbotController] Error handling message for client ${clientId}:`,
        error
      );
      ws.send(JSON.stringify({ error: "메시지 처리 중 오류가 발생했습니다." }));
    } finally {
      const endTime = process.hrtime(startTime);
      const elapsedTime = endTime[0] * 1000 + endTime[1] / 1e6;
      logger.info(
        `Message processed for client ${clientId}: ${elapsedTime.toFixed(2)}ms`
      );
    }
  });

  const cleanupConnection = async () => {
    clearInterval(pingInterval);
    if (clients[clientId]) {
      delete clients[clientId];
      logger.info(
        `Chat client ${clientId} (User: ${userId}) removed. Remaining: ${
          Object.keys(clients).length
        }.`
      );
    }
    try {
      await redisClient.del(chatHistoryKey);
      logger.info(
        `Cleared recent chat history (Redis) for user ${userId} on disconnect.`
      );
    } catch (redisDelError) {
      logger.warn(
        `Could not clear recent chat history (Redis) for user ${userId}:`,
        redisDelError
      );
    }
    await queueChatSummarySave(userId, subjectParam, chatHistory);
  };

  ws.on("close", async (code, reason) => {
    logger.info(
      `Chat client ${clientId} (User: ${userId}) disconnected. Code: ${code}, Reason: ${
        reason ? reason.toString() : "N/A"
      }`
    );
    await cleanupConnection();
  });

  ws.on("error", async (error) => {
    logger.error(
      `Chat WebSocket error for client ${clientId} (User: ${userId}): ${error.message}`,
      { stack: error.stack }
    );
    await cleanupConnection();
  });
};

module.exports = {
  initializeChatConnection,
};
