const logger = require("../utils/logger");
const { maskPII, containsForbiddenContent } = require("../utils/textUtils");
const moderationService = require("./moderationService"); // moderationService 경로 확인
// getNLPResponse는 컨트롤러에서 직접 사용하므로 여기서는 필요 X (만약 이 서비스 내에서 NLP를 직접 호출한다면 필요)

/**
 * 사용자 메시지를 전처리합니다 (PII 마스킹, OpenAI Moderation, 커스텀 필터링).
 * @param {string} rawUserMessage 원본 사용자 메시지
 * @param {string} userId 사용자 ID
 * @param {string} clientId 클라이언트 ID
 * @returns {Promise<object>} 전처리 결과 객체
 */
async function preprocessUserMessage(rawUserMessage, userId, clientId) {
  let messageForProcessing = rawUserMessage;
  let finalUserMessageForHistory = rawUserMessage;
  let isFiltered = false;
  let refusalResponse = null;
  let filterDetails = {};

  // 1. PII 마스킹
  if (messageForProcessing && messageForProcessing.trim()) {
    const originalMessage = messageForProcessing;
    messageForProcessing = maskPII(messageForProcessing);
    finalUserMessageForHistory = messageForProcessing;
    if (messageForProcessing !== originalMessage) {
      logger.info(
        `[ChatbotMsgSvc] PII masked for user ${userId}, client ${clientId}.`
      );
    }
  }

  // 2. OpenAI Moderation 검사
  // if (messageForProcessing && messageForProcessing.trim()) {
  //   const moderationCheck = await moderationService.checkTextWithOpenAI(
  //     messageForProcessing,
  //     userId,
  //     clientId
  //   );
  //   if (moderationCheck.error) {
  //     return {
  //       processedMessage: messageForProcessing,
  //       finalUserMessageForHistory,
  //       isFiltered: true,
  //       refusalResponse: moderationCheck.refusalMessage,
  //       filterDetails: {
  //         type: "ModerationAPIError",
  //         detail: moderationCheck.error.message,
  //         categories: null,
  //       },
  //     };
  //   }
  //   if (moderationCheck.isFlagged) {
  //     isFiltered = true;
  //     refusalResponse = moderationCheck.refusalMessage;
  //     filterDetails = {
  //       type: "ModerationAPI",
  //       detail: "Flagged by OpenAI",
  //       categories: moderationCheck.categories,
  //     };
  //   }
  // }

  // 3. 커스텀 금지어 필터링
  if (!isFiltered && messageForProcessing && messageForProcessing.trim()) {
    const forbiddenContentCheck =
      containsForbiddenContent(messageForProcessing);
    if (forbiddenContentCheck.forbidden) {
      isFiltered = true;
      refusalResponse =
        "죄송합니다. 사용할 수 없는 단어나 표현이 포함되어 있어요. 다른 질문을 해주시겠어요?";
      filterDetails = {
        type: "CustomFilter",
        detail: forbiddenContentCheck.detail,
        categories: null,
      };
    }
  }

  return {
    processedMessage: messageForProcessing,
    finalUserMessageForHistory,
    isFiltered,
    refusalResponse,
    filterDetails,
  };
}

/**
 * 챗봇 응답을 후처리합니다 (OpenAI Moderation, PII 마스킹, 커스텀 필터링).
 * @param {string} rawBotResponse 원본 챗봇 응답
 * @param {string} userId 사용자 ID
 * @param {string} clientId 클라이언트 ID
 * @returns {Promise<string>} 후처리된 챗봇 응답 문자열
 */
async function postprocessBotResponse(rawBotResponse, userId, clientId) {
  let processedBotResponse = rawBotResponse;

  if (!processedBotResponse || !processedBotResponse.trim()) {
    return "";
  }

  // 1. OpenAI Moderation 검사
  // const moderationCheck = await moderationService.checkTextWithOpenAI(
  //   processedBotResponse,
  //   userId,
  //   `${clientId}-botResponse`
  // );
  // if (moderationCheck.error) {
  //   logger.warn(
  //     `[ChatbotMsgSvc] OpenAI Moderation API error for bot response. User ${userId}, Client ${clientId}. Error: ${moderationCheck.error.message}`
  //   );
  //   processedBotResponse =
  //     moderationCheck.refusalMessage ||
  //     "죄송합니다. 답변 생성 중 문제가 발생했습니다. 다른 질문을 해주시겠어요?";
  // } else if (moderationCheck.isFlagged) {
  //   logger.warn(
  //     `[ChatbotMsgSvc] Output flagged by Moderation API for user ${userId}, client ${clientId}. Categories: ${JSON.stringify(
  //       moderationCheck.categories
  //     )}`
  //   );
  //   processedBotResponse = moderationCheck.refusalMessage;
  // }

  // 2. PII 마스킹
  const originalBotResponseForMasking = processedBotResponse;
  processedBotResponse = maskPII(processedBotResponse);
  if (processedBotResponse !== originalBotResponseForMasking) {
    logger.info(
      `[ChatbotMsgSvc] PII masked in bot response for user ${userId}, client ${clientId}.`
    );
  }

  // 3. 커스텀 금지어 필터링
  const forbiddenContentCheck = containsForbiddenContent(processedBotResponse);
  if (forbiddenContentCheck.forbidden) {
    logger.warn(
      `[ChatbotMsgSvc] Output blocked/modified by custom filter for user ${userId}, client ${clientId}. Type: ${forbiddenContentCheck.type}, Detail: ${forbiddenContentCheck.detail}`
    );
    processedBotResponse =
      "죄송합니다. 답변 내용에 부적절한 표현이 포함되어 수정되었습니다.";
  }

  return processedBotResponse;
}

module.exports = {
  preprocessUserMessage,
  postprocessBotResponse,
};
