const { OpenAI } = require("openai");
const logger = require("../utils/logger");
require("dotenv").config(); // OPENAI_API_KEY를 위해

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 주어진 텍스트에 대해 OpenAI Moderation API를 호출하여 유해성 검사를 수행합니다.
 * @param {string} inputText 검사할 텍스트
 * @param {string} userId 사용자 ID (로깅용)
 * @param {string} clientId 클라이언트 ID (로깅용)
 * @returns {Promise<{isFlagged: boolean, refusalMessage: string|null, categories: object|null}>}
 *          isFlagged: 유해 콘텐츠로 분류되었는지 여부
 *          refusalMessage: 유해 콘텐츠일 경우 사용자에게 보여줄 메시지
 *          categories: 유해성 분류 카테고리 (flagged된 경우)
 */
async function checkTextWithOpenAI(inputText, userId, clientId) {
  if (!inputText || !inputText.trim()) {
    return { isFlagged: false, refusalMessage: null, categories: null };
  }

  try {
    const moderationResponse = await openai.moderations.create({
      input: inputText,
    });
    const moderationResult = moderationResponse.results[0];

    if (moderationResult.flagged) {
      logger.warn(
        `[ModerationService] Text flagged by Moderation API. User: ${userId}, Client: ${clientId}. Categories: ${JSON.stringify(
          moderationResult.categories
        )}`
      );
      return {
        isFlagged: true,
        refusalMessage:
          "죄송합니다. 해당 내용은 답변해 드리기 어렵습니다. 다른 질문을 해주시겠어요?", // 기본 거절 메시지
        categories: moderationResult.categories,
      };
    }
    return { isFlagged: false, refusalMessage: null, categories: null };
  } catch (moderationError) {
    logger.error(
      `[ModerationService] Error calling Moderation API. User: ${userId}, Client: ${clientId}:`,
      moderationError
    );
    // Moderation API 호출 실패 시, 안전을 위해 일단 부적절한 것으로 간주하거나
    // 혹은 "검토 중 오류 발생" 메시지를 반환하도록 선택할 수 있습니다.
    // 여기서는 "검토 중 오류 발생"으로 처리하고, isFlagged는 false로 두어 흐름은 이어가되, 에러 상태를 알릴 수 있도록 합니다.
    // 또는 상황에 따라 true로 설정하여 차단할 수도 있습니다.
    return {
      isFlagged: false, // API 오류 시 일단 통과시키되, 별도 처리가 필요함을 알림
      refusalMessage: "메시지 검토 중 오류가 발생했습니다. 다시 시도해주세요.", // API 오류 시 사용자에게 보낼 메시지
      categories: null,
      error: moderationError, // 에러 객체 자체를 반환하여 호출 측에서 추가 대응 가능하도록 함
    };
  }
}

module.exports = {
  checkTextWithOpenAI,
};
