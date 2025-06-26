const { v4: uuidv4 } = require("uuid");
const { getNLPResponse } = require("../services/nlpService");
const { redisClient } = require("../utils/redisClient");
const logger = require("../utils/logger");
const config = require("../config");
const chatUsageService = require("../services/chatUsageService");
const { preprocessUserMessage } = require("../services/chatbotMessageService");
const chatbotInteractionService = require("../services/chatbotInteractionService");
const chatSummaryService = require("../services/chatSummaryService");
const EventEmitter = require("events");

// p-limit을 동적으로 import
let pLimit;
(async () => {
  const pLimitModule = await import("p-limit");
  pLimit = pLimitModule.default;
})();

let dbWriteLimit;

async function initializeDbWriteLimit() {
  if (!pLimit) {
    const pLimitModule = await import("p-limit");
    pLimit = pLimitModule.default;
  }
  if (!dbWriteLimit && pLimit) {
    dbWriteLimit = pLimit(7);
    logger.info("[ChatbotHandler] dbWriteLimit initialized.");
  }
}

let clients = {};

const { RECENT_HISTORY_COUNT } = config.chatLimits;

// 🎯 큐 시스템
const requestQueue = [];
let isProcessingQueue = false;

// 🎯 토큰 이벤트 에미터 생성
const tokenEventEmitter = new EventEmitter();

/**
 * 🎯 큐에서 특정 사용자 요청 제거
 * @param {string} userId - 제거할 사용자 ID
 * @returns {boolean} - 제거 성공 여부
 */
function removeFromQueue(userId) {
  const beforeLength = requestQueue.length;
  for (let i = requestQueue.length - 1; i >= 0; i--) {
    if (requestQueue[i].userId === userId) {
      requestQueue.splice(i, 1);
    }
  }

  const removedCount = beforeLength - requestQueue.length;
  if (removedCount > 0) {
    logger.info(
      `[ChatbotHandler] Removed ${removedCount} queued request(s) for disconnected user ${userId}`
    );
    return true;
  }
  return false;
}

/**
 * 🎯 큐에서 요청을 순차적으로 처리
 */
async function processRequestQueue() {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  try {
    while (requestQueue.length > 0) {
      const requestData = requestQueue[0];
      const {
        ws,
        messagesForNLP,
        userId,
        clientId,
        chatHistoryKey,
        chatHistory,
        finalUserMessageForHistory,
      } = requestData;

      // WebSocket 연결 유효성 확인 (이중 안전장치)
      if (ws.readyState !== ws.OPEN) {
        logger.warn(
          `[ChatbotHandler] WebSocket closed for queued request: ${userId} (backup cleanup)`
        );
        requestQueue.shift();
        continue;
      }

      const requestId = `${userId}_${Date.now()}`;

      try {
        ws.send(
          JSON.stringify({
            type: "queue_status",
            status: "processing",
            message: "답변을 생성하고 있어요...",
          })
        );

        const streamResponse = getNLPResponse(
          messagesForNLP.systemPrompt,
          messagesForNLP.userMessages,
          requestId
        );

        let rawBotResponseContent = "";
        for await (const botResp of streamResponse) {
          ws.send(JSON.stringify({ bot: botResp, isFinal: false }));
          rawBotResponseContent += botResp;
        }
        ws.send(JSON.stringify({ bot: null, isFinal: true }));

        await chatbotInteractionService.saveToChatHistory(
          chatHistoryKey,
          chatHistory,
          finalUserMessageForHistory,
          rawBotResponseContent,
          userId
        );

        requestQueue.shift();
        logger.info(
          `[ChatbotHandler] Successfully processed queued request for user ${userId}`
        );
      } catch (error) {
        if (error.message.startsWith("RATE_LIMIT_EXCEEDED:")) {
          logger.info(
            `[ChatbotHandler] Rate limit hit, keeping request in queue for user ${userId}`
          );
          break;
        } else {
          requestQueue.shift();
          logger.error(
            `[ChatbotHandler] Error processing queued request for user ${userId}:`,
            error
          );

          if (error.message.startsWith("ANTHROPIC_OVERLOADED:")) {
            ws.send(
              JSON.stringify({
                type: "anthropic_overloaded",
                message:
                  "AI 서버가 일시적으로 과부하 상태입니다. 30초 후 다시 시도해주세요.",
              })
            );
          } else if (error.message.startsWith("ANTHROPIC_RATE_LIMIT:")) {
            ws.send(
              JSON.stringify({
                type: "anthropic_rate_limit",
                message: "API 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
              })
            );
          } else {
            ws.send(
              JSON.stringify({ error: "메시지 처리 중 오류가 발생했습니다." })
            );
          }
        }
      }
    }
  } catch (error) {
    logger.error(`[ChatbotHandler] Error in processRequestQueue:`, error);
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * 🎯 요청을 큐에 추가
 */
async function addToQueue(userId, ws, requestData) {
  const wasEmpty = requestQueue.length === 0;

  requestQueue.push({ userId, ws, ...requestData, timestamp: Date.now() });

  if (wasEmpty) {
    logger.info(
      `[ChatbotHandler] Adding first request to queue for user ${userId}, processing immediately`
    );
    processRequestQueue();
  } else {
    const queuePosition = requestQueue.length;
    const estimatedWaitTime = (queuePosition - 1) * 5;

    // 🎯 시간 포맷팅 개선
    let timeMessage;
    if (estimatedWaitTime < 60) {
      timeMessage = `${estimatedWaitTime}초`;
    } else {
      const minutes = Math.ceil(estimatedWaitTime / 60);
      timeMessage = `${minutes}분`;
    }

    ws.send(
      JSON.stringify({
        type: "queue_status",
        status: "waiting",
        position: queuePosition,
        estimatedWaitTime,
        message: `대기열 ${queuePosition}번째 순서입니다. 예상 대기시간: ${timeMessage}`,
      })
    );

    logger.info(
      `[ChatbotHandler] Added user ${userId} to queue at position ${queuePosition}`
    );
  }
}

// 토큰 제거 이벤트 리스너
tokenEventEmitter.on("tokenRemoved", () => {
  if (requestQueue.length > 0 && !isProcessingQueue) {
    logger.info(
      "[ChatbotHandler] Token removal event received, triggering queue processing"
    );
    processRequestQueue();
  }
});

// 안전장치: 주기적 큐 체크
setInterval(() => {
  if (requestQueue.length > 0 && !isProcessingQueue) {
    logger.debug(
      `[ChatbotHandler] Safety check: ${requestQueue.length} requests in queue, triggering processing`
    );
    processRequestQueue();
  }
}, 5000);

async function queueChatSummarySave(userId, subject, chatHistoryToSave) {
  await initializeDbWriteLimit();
  if (!dbWriteLimit) {
    logger.error(
      "[ChatbotHandler] dbWriteLimit is not initialized. Cannot queue chat summary save."
    );
    return;
  }
  if (chatHistoryToSave && chatHistoryToSave.length > 0) {
    logger.info(
      `[ChatbotHandler] Queueing chat summary save for user ${userId}, subject ${subject}. History length: ${chatHistoryToSave.length}`
    );
    dbWriteLimit(() =>
      chatSummaryService.saveChatSummary(userId, subject, chatHistoryToSave)
    )
      .then(() => {
        logger.debug(
          `[ChatbotHandler] DB write task (chat summary) completed for user ${userId}, subject ${subject}.`
        );
      })
      .catch((error) => {
        logger.error(
          `[ChatbotHandler] DB write task (chat summary) failed for user ${userId}, subject ${subject}:`,
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
  await initializeDbWriteLimit();

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
        logger.info(
          `Initial or empty message received from user ${userId}, usage count not incremented.`
        );

        const messagesForNLP =
          chatbotInteractionService.constructInitialNLPRequestMessages(
            grade,
            subject,
            unit,
            topic
          );

        await addToQueue(userId, ws, {
          messagesForNLP,
          clientId,
          chatHistoryKey,
          chatHistory,
          finalUserMessageForHistory: "",
        });
        return;
      }

      const usageUpdateResult =
        await chatUsageService.incrementAndCheckUsageOnMessage(userId);
      if (!usageUpdateResult.success) {
        return;
      }
      logger.info(`[ChatbotCtrl] Usage count updated for user ${userId}.`);

      const {
        processedMessage: messageForProcessing,
        finalUserMessageForHistory,
        isFiltered: userMessageIsFiltered,
        refusalResponse: userMessageRefusalResponse,
      } = await preprocessUserMessage(rawUserMessage, userId, clientId);

      if (userMessageIsFiltered) {
        ws.send(
          JSON.stringify({ bot: userMessageRefusalResponse, isFinal: true })
        );
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
        return;
      }

      const recentHistory = chatHistory.slice(-RECENT_HISTORY_COUNT);
      const messagesForNLP =
        chatbotInteractionService.constructNLPRequestMessages(
          grade,
          subject,
          unit,
          topic,
          recentHistory,
          messageForProcessing
        );

      await addToQueue(userId, ws, {
        messagesForNLP,
        clientId,
        chatHistoryKey,
        chatHistory,
        finalUserMessageForHistory,
      });
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

    // 🎯 새로 추가: 큐에서 해당 사용자 요청 실시간 제거
    removeFromQueue(userId);

    await cleanupConnection();
  });

  ws.on("error", async (error) => {
    logger.error(
      `Chat WebSocket error for client ${clientId} (User: ${userId}): ${error.message}`,
      { stack: error.stack }
    );

    // 🎯 새로 추가: 에러 시에도 큐에서 제거
    removeFromQueue(userId);

    await cleanupConnection();
  });
};

module.exports = {
  initializeChatConnection,
  tokenEventEmitter,
};
