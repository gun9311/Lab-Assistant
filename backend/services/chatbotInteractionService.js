const logger = require("../utils/logger");
const { redisClient } = require("../utils/redisClient"); // Redis 클라이언트 직접 사용
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
  const systemMessageContent = `<role_definition>
    너는 **${grade}학년** ${subject} ${unit ? `${unit} 단원 ` : ""}${topic} 학습을 돕는 초등학생 AI 튜터야. 
    한국 초등학생 눈높이에 맞춰 다음 원칙을 지켜야 해:

    **<safety_rules>**
    1. 유해 콘텐츠 금지: 폭력, 차별, 성적, 정치/종교, 거짓정보, 개인정보 등
    2. 정확성: 모르면 "잘 모르겠어요" 답변, 추측 금지
    3. 학습 집중: ${topic}에 집중, 벗어나면 학습으로 유도
    4. 긍정적 격려: 칭찬과 자신감 부여 (이모지 적절히 사용 ✨👍🤔📌😊🎉💡)
    5. 존댓말 필수
    </safety_rules>

    **<guidance_principles>**
    학생 스스로 생각하도록 유도:
    1. 간결 답변 + 확장 질문 ("다른 예시는?", "친구라면?")
    2. 선택지 제시 및 상상 유도
    3. 답 대신 질문 ("왜 그럴까?", "다른 방법은?")
    4. 개념 확인 ("왜 중요할까?", "어디에 쓸까?")
    5. 실수해도 긍정적 피드백

    **<response_style>**
    핵심만 간결명확 / 필요시 마크다운 사용
    </response_style>
    `; 


  const systemPrompt = systemMessageContent; // 시스템 메시지 내용
  const userMessages = [
    // 시스템 메시지를 제외한 사용자/어시스턴트 메시지
    ...recentHistory
      .map((chat) => [
        { role: "user", content: chat.user },
        { role: "assistant", content: chat.bot },
      ])
      .flat(),
    { role: "user", content: processedUserMessage },
  ];

  if (
    !userMessages ||
    !userMessages.every((m) => typeof m.content === "string")
  ) {
    logger.error(
      "[ChatbotInteractionSvc] Invalid userMessages format for NLP request:",
      userMessages
    );
    throw new Error("메시지 형식이 올바르지 않아 처리할 수 없습니다.");
  }
  // systemPrompt도 유효성 검사 추가 가능

  return { systemPrompt, userMessages }; // 객체로 반환
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
  const systemMessageContent = `<role_definition>너는 초등학생을 위한 친절하고 **매우 안전한** AI 학습 튜터야. 현재 **${grade}학년** 학생의 ${subject} ${
    unit ? `${unit} 단원 ` : ""
  }${topic} 학습을 돕고 있어`; // 시스템 메시지 전문 필요

  const initialPromptContent = `안녕하세요! ${topic}(${subject} ${grade}학년) 학습을 시작하려고 합니다. 간결하게 인사해 주세요.`;

  const systemPrompt = systemMessageContent;
  const userMessages = [{ role: "user", content: initialPromptContent }];

  // 유효성 검사 추가 가능
  return { systemPrompt, userMessages }; // 객체로 반환
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
