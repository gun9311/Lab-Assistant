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

    // 1. 먼저 해당 subject가 존재하는지 확인하고, 존재하면 summaries 배열에 push
    const updateResult = await ChatSummary.findOneAndUpdate(
      { student: userId, "subjects.subject": subject }, // 학생 ID와 과목 이름이 모두 일치하는 문서를 찾는다
      { $push: { "subjects.$.summaries": newSummaryEntry } }, // 찾은 과목의 summaries 배열에 새 요약을 추가한다
      { new: true } // 업데이트된 문서를 반환하도록 설정
    );

    // 2. 만약 위에서 업데이트가 안됐다면 (해당 과목이 없다는 뜻)
    if (!updateResult) {
      // 3. 학생 문서는 찾되, subjects 배열에 새로운 과목 객체를 통째로 push
      await ChatSummary.findOneAndUpdate(
        { student: userId },
        {
          $push: {
            subjects: { subject: subject, summaries: [newSummaryEntry] },
          },
        },
        { upsert: true, new: true } // upsert: true -> 학생 문서 자체가 없으면 새로 생성해준다
      );
    }

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
