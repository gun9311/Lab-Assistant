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
 * Redis 세션의 모든 참가자 키를 조회하기 위한 패턴을 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 패턴 (예: "session:123456:participant:*")
 */
const getParticipantKeysPattern = (pin) => `session:${pin}:participant:*`;

/**
 * Redis 대기 중인 학생 목록 키를 생성합니다.
 * @param {string} pin - 세션 PIN 번호
 * @returns {string} Redis 키 (예: "waitingStudents:123456")
 */
const getWaitingStudentsKey = (pin) => `waitingStudents:${pin}`;

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

module.exports = {
  getSessionKey,
  // getPinCheckKey,
  getParticipantKey,
  getParticipantKeysPattern,
  getWaitingStudentsKey,
  // getQuestionContentKey,
  getSessionQuestionsKey,
};
