const logger = require("../utils/logger");
const redisClient = require("../utils/redisClient"); // Redis 클라이언트 직접 사용
const config = require("../config");

const { RECENT_HISTORY_COUNT } = config.chatLimits;

/**
 * NLP 서비스에 전달할 메시지 배열을 구성합니다.
 * @param {string} grade 학년
 * @param {string} subject 과목
 * @param {string} unit 단원 (nullable)
 * @param {string} topic 주제
 * @param {Array<object>} recentHistory 최근 대화 기록 (예: [{user: "...", bot: "..."}, ...])
 * @param {string} processedUserMessage 전처리된 사용자 메시지
 * @returns {Array<object>} NLP 서비스 요청용 메시지 배열
 */
function constructNLPRequestMessages(
  grade,
  subject,
  unit,
  topic,
  recentHistory,
  processedUserMessage
) {
  // 시스템 메시지 동적 구성
  const systemMessageContent = `너는 초등학생을 위한 친절하고 **매우 안전한** AI 학습 튜터야. 현재 **${grade}학년** 학생의 ${subject} ${
    unit ? `${unit} 단원 ` : ""
  }${topic} 학습을 돕고 있어. 
  **학습 배경은 대한민국이며, 한국 초등학생의 눈높이에 맞춰야 해.** 다음 원칙을 **반드시** 지켜야 해:

  ---
  
  **[핵심 안전 규칙]**
  1.  **유해 콘텐츠 금지:** 폭력, 차별, 성적, 정치/종교 편향, 거짓 정보, 개인정보 질문 등 부적절한 내용 생성 금지. (**개인정보는 마스킹됨**)
  2.  **정확성과 정직성:** 모르는 질문에는 "잘 모르겠어요." 또는 "다른 학습 질문을 해볼까요?"라고 답하고, **추측하거나 지어내지 말기**.
  3.  **학습 집중:** 주제(${topic})에 집중하고, 벗어나는 질문은 자연스럽게 학습으로 유도하기.
  4.  **긍정적 태도:** 학생을 격려하고 칭찬하며 자신감을 키워주기. 필요 시 긍정적 이모지(✨👍🤔📌😊🎉💡)를 적절히 사용.
  5.  **항상 존댓말 사용:** 모든 답변은 친절하고 정중한 **존댓말**로 작성.
  
  ---
  
  **[학생 사고 유도 규칙]**
  * 학생이 스스로 생각하고 답을 찾도록 유도합니다.
  
  1. **간단히 답변 후 확장 질문 추가**
     * 핵심만 간결히 답변하고, 이어서 생각을 확장할 질문을 합니다.
     * 예: "다른 예시도 생각나나요?", "친구라면 어떻게 했을까요?"
  
  2. **선택지 제시 및 상상 유도**
     * 선택지를 제시하거나 상상할 수 있게 질문합니다.
     * 예: "이 방법과 저 방법 중 어떤 게 좋을까요?"
  
  3. **답 대신 질문 유도**
     * 바로 답하지 말고 "왜 그렇게 생각했을까요?", "다른 방법은 없을까요?"처럼 질문을 던집니다.
     * 어려워하면 결정적 힌트나 쉬운 질문으로 돕습니다.
  
  4. **개념 확인 및 응용 질문**
     * 설명 후 "왜 중요할까요?", "이걸로 무엇을 할 수 있을까요?" 같은 질문을 합니다.
  
  5. **긍정적 연결**
     * 실수해도 긍정적으로 피드백합니다.
  
  ---
  
  **[답변 스타일]**
  * 답변은 핵심만 간결하고 명확하게.
  * 필요시 목록(*, 숫자)과 강조(**굵게**)를 마크다운으로 사용.
  * 이모지는 꼭 필요할 때만 사용합니다.
  
  `; // 실제 시스템 메시지 전체 내용

  const messages = [
    { role: "system", content: systemMessageContent },
    ...recentHistory
      .map((chat) => [
        { role: "user", content: chat.user },
        { role: "assistant", content: chat.bot },
      ])
      .flat(),
    { role: "user", content: processedUserMessage },
  ];

  if (!messages || !messages.every((m) => typeof m.content === "string")) {
    logger.error(
      "[ChatbotInteractionSvc] Invalid messages format for NLP request:",
      messages
    );
    throw new Error("메시지 형식이 올바르지 않아 처리할 수 없습니다."); // 또는 null 반환 후 컨트롤러에서 처리
  }
  return messages;
}

/**
 * 초기 인사 메시지 또는 빈 메시지 수신 시 NLP 요청 메시지를 구성합니다.
 * @param {string} grade 학년
 * @param {string} subject 과목
 * @param {string} unit 단원 (nullable)
 * @param {string} topic 주제
 * @returns {Array<object>} NLP 서비스 요청용 메시지 배열
 */
function constructInitialNLPRequestMessages(grade, subject, unit, topic) {
  const systemMessageContent = `너는 초등학생을 위한 친절하고 **매우 안전한** AI 학습 튜터야. 현재 **${grade}학년** 학생의 ${subject} ${
    unit ? `${unit} 단원 ` : ""
  }${topic} 학습을 돕고 있어. ... (이하 전체 시스템 메시지 내용 동일하게) ... `; // 시스템 메시지 전문 필요

  const initialPromptContent = `안녕하세요! ${topic}(${
    unit ? `${unit} 단원 ` : ""
  }${subject} ${grade}학년) 학습을 시작하려고 합니다. 편하게 인사해 주세요.`;

  return [
    { role: "system", content: systemMessageContent },
    { role: "user", content: initialPromptContent },
  ];
}

/**
 * 대화 내용을 메모리 내 chatHistory 배열과 Redis에 저장합니다.
 * @param {string} chatHistoryKey Redis 저장을 위한 키
 * @param {Array<object>} chatHistory 메모리 내 전체 대화 기록 배열 (이 함수 내에서 직접 수정됨)
 * @param {string} userMessageForHistory 히스토리에 저장될 사용자 메시지
 * @param {string} botMessageForHistory 히스토리에 저장될 챗봇 응답 메시지
 * @param {string} userId 사용자 ID (로깅용)
 */
async function saveToChatHistory(
  chatHistoryKey,
  chatHistory,
  userMessageForHistory,
  botMessageForHistory,
  userId
) {
  if (
    userMessageForHistory &&
    userMessageForHistory.trim() &&
    botMessageForHistory
  ) {
    chatHistory.push({
      user: userMessageForHistory,
      bot: botMessageForHistory,
    });
    const recentHistoryForRedis = chatHistory.slice(-RECENT_HISTORY_COUNT);
    try {
      await redisClient.set(
        chatHistoryKey,
        JSON.stringify(recentHistoryForRedis)
      );
      logger.info(
        `[ChatbotInteractionSvc] Chat history saved to Redis for user ${userId}. Recent count: ${recentHistoryForRedis.length}`
      );
    } catch (redisSetError) {
      logger.error(
        `[ChatbotInteractionSvc] Failed to save recent history to Redis for user ${userId}:`,
        redisSetError
      );
      // Redis 저장 실패는 일단 계속 진행 (메모리에는 있음)
    }
  } else {
    logger.warn(
      `[ChatbotInteractionSvc] Skipped saving to chat history due to empty user or bot message. User: ${userId}`
    );
  }
}

module.exports = {
  constructNLPRequestMessages,
  constructInitialNLPRequestMessages,
  saveToChatHistory,
};
