const ChatSummary = require("../models/ChatSummary");
const logger = require("../utils/logger");

/**
 * 주어진 사용자 ID, 주제, 채팅 기록을 바탕으로 ChatSummary를 생성하거나 업데이트합니다.
 * @param {string} userId 학생 ID
 * @param {string} subject 주제
 * @param {Array<object>} chatHistoryToSave 저장할 채팅 기록 (예: [{user: "...", bot: "..."}, ...])
 * @returns {Promise<void>}
 */
async function saveChatSummary(userId, subject, chatHistoryToSave) {
  try {
    if (
      !chatHistoryToSave ||
      !Array.isArray(chatHistoryToSave) ||
      chatHistoryToSave.length === 0
    ) {
      logger.warn(
        `[ChatSummarySvc] Invalid or empty chat history for user ${userId}, subject ${subject}. Skipping save.`
      );
      return;
    }

    const summaryText = chatHistoryToSave
      .map((msg) => `You: ${msg.user}\nBot: ${msg.bot}`)
      .join("\n");

    if (!summaryText || summaryText.trim() === "") {
      logger.info(
        `[ChatSummarySvc] Empty summary generated from chat history for user ${userId}, subject ${subject}. Skipping save.`
      );
      return;
    }

    const newSummaryEntry = { summary: summaryText, createdAt: new Date() };
    let chatSummaryDoc = await ChatSummary.findOne({ student: userId });

    if (chatSummaryDoc) {
      logger.info(
        `[ChatSummarySvc] Found existing ChatSummary for student ${userId}. Updating subjects.`
      );
      let subjectData = chatSummaryDoc.subjects.find(
        (sub) => sub.subject === subject
      );

      if (subjectData) {
        logger.debug(
          `[ChatSummarySvc] Subject '${subject}' found for student ${userId}. Adding new summary.`
        );
        subjectData.summaries.unshift(newSummaryEntry); // 최신 요약을 맨 앞에 추가
      } else {
        logger.debug(
          `[ChatSummarySvc] Subject '${subject}' not found for student ${userId}. Adding new subject entry.`
        );
        chatSummaryDoc.subjects.push({
          subject: subject,
          summaries: [newSummaryEntry],
        });
      }
    } else {
      logger.info(
        `[ChatSummarySvc] No existing ChatSummary for student ${userId}. Creating new one with subject '${subject}'.`
      );
      chatSummaryDoc = new ChatSummary({
        student: userId,
        subjects: [{ subject: subject, summaries: [newSummaryEntry] }],
      });
    }

    await chatSummaryDoc.save();
    logger.info(
      `[ChatSummarySvc] Chat summary saved successfully for student ${userId}, subject '${subject}'.`
    );
  } catch (error) {
    logger.error(
      `[ChatSummarySvc] Failed to save chat summary for student ${userId}, subject '${subject}':`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    // 이 서비스 함수에서 발생한 에러는 호출한 쪽(예: dbWriteLimit의 catch)에서 처리될 수 있도록 throw하거나,
    // 혹은 여기서 특정 방식으로 처리 후 반환값을 다르게 줄 수 있습니다.
    // 현재는 로깅만 하고 에러를 전파하지 않습니다 (dbWriteLimit의 .catch에서 로깅됨).
    // 필요하다면 throw error; 를 추가할 수 있습니다.
  }
}

module.exports = {
  saveChatSummary,
};
