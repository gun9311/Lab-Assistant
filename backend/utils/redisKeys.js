/**
 * Redis 세션 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "session:123456")
 */
const getSessionKey = (pin) => `session:${pin}`;

/**
 * Redis PIN 존재 여부 확인용 키를 생성합니다.
 * (generateUniquePIN 함수에서 사용)
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "session:pin:123456")
 */
// const getPinCheckKey = (pin) => `session:pin:${pin}`;

/**
 * Redis 세션 참가자 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @param {string} studentId - 학생 ID
 * @returns {string} Redis 키 (예: "session:123456:participant:student123")
 */
const getParticipantKey = (pin, studentId) =>
  `session:${pin}:participant:${studentId}`;

/**
//  * Redis 퀴즈 콘텐츠 키를 생성합니다.
//  * @param {string} quizContentId - 퀴즈 콘텐츠 ID
//  * @returns {string} Redis 키 (예: "questionContent:quizAbc123")
//  */
// const getQuestionContentKey = (quizContentId) =>
//   `questionContent:${quizContentId}`;

/**
 * Redis 세션별 질문 스냅샷 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "session:123456:questions")
 */
const getSessionQuestionsKey = (pin) => `session:${pin}:questions`;

/**
 * Redis 세션별 참여 학생 ID Set 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "session:123456:student_ids")
 */
const getSessionStudentIdsSetKey = (pin) => `session:${pin}:student_ids`;

/**
 * Redis 세션별 선점된 캐릭터 Set 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "session:123456:taken_characters")
 */
const getSessionTakenCharactersSetKey = (pin) =>
  `session:${pin}:taken_characters`;

/**
 * Redis Pub/Sub 채널 패턴 (모든 세션 관련 메시지 구독용)
 * @returns {string}
 */
const getRedisChannelPatternAllSessionMessages = () => `session:*:pubsub:*`;

/**
 * 특정 PIN의 모든 학생에게 브로드캐스트하기 위한 Pub/Sub 채널 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis Pub/Sub 채널 키
 */
const getRedisChannelBroadcastToStudents = (pin) =>
  `session:${pin}:pubsub:broadcast_students`;

/**
 * 특정 PIN의 활성 학생에게 브로드캐스트하기 위한 Pub/Sub 채널 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis Pub/Sub 채널 키
 */
const getRedisChannelBroadcastToActiveStudents = (pin) =>
  `session:${pin}:pubsub:broadcast_active_students`;

/**
 * 특정 PIN의 교사에게 브로드캐스트하기 위한 Pub/Sub 채널 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis Pub/Sub 채널 키
 */
const getRedisChannelBroadcastToTeacher = (pin) =>
  `session:${pin}:pubsub:broadcast_teacher`;

/**
 * 특정 PIN의 학생들에게 개별 피드백 목록을 전달하기 위한 Pub/Sub 채널 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis Pub/Sub 채널 키
 */
const getRedisChannelIndividualFeedbackList = (pin) =>
  `session:${pin}:pubsub:individual_feedback_list`;

/**
 * 특정 PIN의 모든 학생 연결을 강제로 종료하기 위한 Pub/Sub 채널 키를 생성합니다.
 * (예: 교사가 상세 결과 보기 시)
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis Pub/Sub 채널 키
 */
const getRedisChannelForceCloseStudents = (pin) =>
  `session:${pin}:pubsub:force_close_students`;

/**
 * 교사가 상세 결과를 보고 있는지 여부를 나타내는 플래그 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "session:123456:teacher_viewing_results")
 */
const getTeacherViewingResultsFlagKey = (pin) =>
  `session:${pin}:teacher_viewing_results`;

/**
 * Redis에 rate limit 추적용 키를 생성합니다.
 * @param {string} type - 유형
 * @returns {string} Redis 키 (예: "anthropic:ratelimit:type")
 */
const getAnthropicRateLimitKey = (type) => `anthropic:ratelimit:${type}`;

/**
 * 현재 사용중인 입력 토큰 수를 저장하는 키
 * @returns {string} Redis 키
 */
const getCurrentInputTokensKey = () => `anthropic:current_input_tokens`;

/**
 * 현재 사용중인 출력 토큰 수를 저장하는 키
 * @returns {string} Redis 키
 */
const getCurrentOutputTokensKey = () => `anthropic:current_output_tokens`;

/**
 * 특정 요청의 토큰 정보를 저장하는 키 (1분 후 제거용)
 * @param {string} requestId - 요청 ID
 * @returns {string} Redis 키
 */
const getRequestTokenKey = (requestId) => `anthropic:request:${requestId}`;

/**
 * 토큰 제거 스케줄을 저장하는 키
 * @returns {string} Redis 키
 */
const getTokenRemovalScheduleKey = () => `anthropic:token_removal_schedule`;

module.exports = {
  getSessionKey,
  getParticipantKey,
  getSessionQuestionsKey,
  getSessionStudentIdsSetKey,
  getSessionTakenCharactersSetKey,
  getRedisChannelPatternAllSessionMessages,
  getRedisChannelBroadcastToStudents,
  getRedisChannelBroadcastToActiveStudents,
  getRedisChannelBroadcastToTeacher,
  getRedisChannelIndividualFeedbackList,
  getRedisChannelForceCloseStudents,
  getTeacherViewingResultsFlagKey,
  getAnthropicRateLimitKey,
  getCurrentInputTokensKey,
  getCurrentOutputTokensKey,
  getRequestTokenKey,
  getTokenRemovalScheduleKey,
};
