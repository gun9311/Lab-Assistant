require("dotenv").config();
// const { OpenAI } = require("openai"); // OpenAI SDK 주석 처리
const Anthropic = require("@anthropic-ai/sdk"); // Anthropic SDK 가져오기
const config = require("../config"); // 설정 파일 로드
const { redisClient } = require("../utils/redisClient");
const {
  getCurrentInputTokensKey,
  getCurrentOutputTokensKey,
  getRequestTokenKey,
} = require("../utils/redisKeys");
const logger = require("../utils/logger");

// const openai = new OpenAI({ // OpenAI 클라이언트 초기화 주석 처리
//   apiKey: process.env.OPENAI_API_KEY,
// });
const anthropic = new Anthropic({
  // Anthropic 클라이언트 초기화
  apiKey: process.env.ANTHROPIC_API_KEY, // .env 파일에서 API 키를 읽어옴
});

const { apiRateLimits } = config;

/**
 * 🎯 서버 시작 시 만료된 토큰 예약들 정리
 */
async function cleanupOrphanedTokens() {
  try {
    logger.info(
      "[nlpService] Starting cleanup of orphaned token reservations..."
    );

    // 모든 요청키 조회 (TTL 없으므로 모든 키가 남아있음)
    const keys = await redisClient.keys("anthropic:request:*");
    let totalInputToRemove = 0;
    let totalOutputToRemove = 0;
    let cleanedCount = 0;

    for (const key of keys) {
      try {
        const dataStr = await redisClient.get(key);
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);
        const ageInMs = Date.now() - data.timestamp;

        // 🎯 70초(70000ms) 넘은 요청키들 정리 (TTL 역할 대신)
        if (ageInMs > 70000) {
          totalInputToRemove += data.inputTokens || 0;
          totalOutputToRemove += data.outputTokens || 0;
          await redisClient.del(key);
          cleanedCount++;

          logger.debug(
            `[nlpService] Cleaned expired reservation: ${key} (age: ${Math.round(
              ageInMs / 1000
            )}s)`
          );
        }
      } catch (parseError) {
        logger.warn(
          `[nlpService] Failed to parse request key ${key}, deleting:`,
          parseError.message
        );
        await redisClient.del(key);
        cleanedCount++;
      }
    }

    // 누적된 토큰들 한번에 제거
    if (totalInputToRemove > 0 || totalOutputToRemove > 0) {
      const pipeline = redisClient.multi();
      pipeline.decrBy(getCurrentInputTokensKey(), totalInputToRemove);
      pipeline.decrBy(getCurrentOutputTokensKey(), totalOutputToRemove);
      await pipeline.exec();

      logger.info(
        `[nlpService] Cleanup completed: ${cleanedCount} reservations cleaned, Input: -${totalInputToRemove}, Output: -${totalOutputToRemove}`
      );
    } else {
      logger.info(
        `[nlpService] Cleanup completed: No orphaned reservations found`
      );
    }

    // 정리 후 현재 상태 출력
    const currentInput =
      (await redisClient.get(getCurrentInputTokensKey())) || "0";
    const currentOutput =
      (await redisClient.get(getCurrentOutputTokensKey())) || "0";
    logger.info(
      `[nlpService] Current token state after cleanup - Input: ${currentInput}/${apiRateLimits.MAX_INPUT_TOKENS_PER_MINUTE}, Output: ${currentOutput}/${apiRateLimits.MAX_OUTPUT_TOKENS_PER_MINUTE}`
    );
  } catch (error) {
    logger.error("[nlpService] Token cleanup failed:", error);
  }
}

/**
 * 🎯 새로운 Sliding Window 방식 Rate Limit 체크
 * @param {string} requestId - 고유 요청 ID
 * @returns {Promise<{allowed: boolean, waitTime?: number}>}
 */
async function checkAndReserveTokens(requestId) {
  try {
    const inputTokensKey = getCurrentInputTokensKey();
    const outputTokensKey = getCurrentOutputTokensKey();

    // 현재 사용량 조회
    const [currentInputStr, currentOutputStr] = await Promise.all([
      redisClient.get(inputTokensKey),
      redisClient.get(outputTokensKey),
    ]);

    const currentInput = parseInt(currentInputStr || "0");
    const currentOutput = parseInt(currentOutputStr || "0");

    const estimatedInput = apiRateLimits.ESTIMATED_INPUT_TOKENS;
    const estimatedOutput = apiRateLimits.ESTIMATED_OUTPUT_TOKENS;

    // 한도 체크
    if (
      currentInput + estimatedInput >
        apiRateLimits.MAX_INPUT_TOKENS_PER_MINUTE ||
      currentOutput + estimatedOutput >
        apiRateLimits.MAX_OUTPUT_TOKENS_PER_MINUTE
    ) {
      logger.warn(
        `[nlpService] Rate limit reached. Input: ${
          currentInput + estimatedInput
        }/${apiRateLimits.MAX_INPUT_TOKENS_PER_MINUTE}, Output: ${
          currentOutput + estimatedOutput
        }/${apiRateLimits.MAX_OUTPUT_TOKENS_PER_MINUTE}`
      );

      // 다음 토큰 제거까지 대기 시간 추정 (간단히 30초로 설정)
      return { allowed: false, waitTime: 30000 };
    }

    // 🎯 토큰 예약 (원자적 연산)
    const pipeline = redisClient.multi();
    pipeline.incrBy(inputTokensKey, estimatedInput);
    pipeline.incrBy(outputTokensKey, estimatedOutput);

    // 🎯 요청 정보 저장 (TTL 제거 - 무제한 보존)
    const requestTokenInfo = {
      inputTokens: estimatedInput,
      outputTokens: estimatedOutput,
      timestamp: Date.now(),
    };
    pipeline.set(
      getRequestTokenKey(requestId),
      JSON.stringify(requestTokenInfo)
      // 🚫 { EX: 70 } TTL 제거!
    );

    await pipeline.exec();

    // 🎯 1분 후 토큰 제거 스케줄링
    scheduleTokenRemoval(requestId, estimatedInput, estimatedOutput);

    logger.info(
      `[nlpService] Tokens reserved for request ${requestId}. Input: +${estimatedInput}, Output: +${estimatedOutput}`
    );

    return { allowed: true };
  } catch (error) {
    logger.error("[nlpService] Rate limit check failed:", error);
    return { allowed: true }; // 에러 시 허용 (fallback)
  }
}

/**
 * 🎯 1분 후 토큰 제거 스케줄링
 * @param {string} requestId
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
function scheduleTokenRemoval(requestId, inputTokens, outputTokens) {
  setTimeout(async () => {
    try {
      await removeTokens(requestId, inputTokens, outputTokens);
    } catch (error) {
      logger.error(
        `[nlpService] Failed to remove tokens for request ${requestId}:`,
        error
      );
    }
  }, 60000); // 60초 후
}

/**
 * 🎯 토큰 제거 및 큐 트리거
 * @param {string} requestId
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
async function removeTokens(requestId, inputTokens, outputTokens) {
  try {
    const inputTokensKey = getCurrentInputTokensKey();
    const outputTokensKey = getCurrentOutputTokensKey();

    // 토큰 제거
    const pipeline = redisClient.multi();
    pipeline.decrBy(inputTokensKey, inputTokens);
    pipeline.decrBy(outputTokensKey, outputTokens);
    pipeline.del(getRequestTokenKey(requestId));
    await pipeline.exec();

    logger.info(
      `[nlpService] Tokens removed for request ${requestId}. Input: -${inputTokens}, Output: -${outputTokens}`
    );

    // 🎯 EventEmitter로 큐 트리거
    try {
      const {
        tokenEventEmitter,
      } = require("../handlers/chatbotWebSocketHandler");
      tokenEventEmitter.emit("tokenRemoved", { requestId });
    } catch (requireError) {
      logger.warn(
        "[nlpService] Could not trigger queue processing:",
        requireError.message
      );
    }
  } catch (error) {
    logger.error(`[nlpService] Error removing tokens:`, error);
  }
}

const getNLPResponse = async function* (systemPrompt, userMessages, requestId) {
  // 🎯 토큰 예약 체크
  const rateLimitCheck = await checkAndReserveTokens(requestId);
  if (!rateLimitCheck.allowed) {
    throw new Error(`RATE_LIMIT_EXCEEDED:${rateLimitCheck.waitTime}`);
  }

  try {
    const stream = await anthropic.messages.stream({
      model: config.anthropicAI.MODEL,
      system: systemPrompt,
      messages: userMessages,
      max_tokens: config.anthropicAI.MAX_TOKENS,
      temperature: config.anthropicAI.TEMPERATURE,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  } catch (error) {
    logger.error("[nlpService] Error in getNLPResponse (Anthropic):", error);

    // Anthropic 특정 에러 분류
    if (error instanceof Anthropic.APIError) {
      if (error.error?.type === "overloaded_error") {
        throw new Error(`ANTHROPIC_OVERLOADED:${error.message}`);
      } else if (error.error?.type === "rate_limit_error") {
        throw new Error(`ANTHROPIC_RATE_LIMIT:${error.message}`);
      }
    }

    throw error;
  }
};

module.exports = {
  getNLPResponse,
  cleanupOrphanedTokens, // 🎯 새로 export
};
