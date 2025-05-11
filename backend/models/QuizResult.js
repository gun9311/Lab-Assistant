const mongoose = require("mongoose");
const { Schema } = mongoose;

// 개별 문제의 결과 스키마
const resultSchema = new mongoose.Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    required: true,
  }, // 퀴즈 문제 ID (세션 스냅샷 내 질문 객체의 _id)
  studentAnswer: { type: Number, required: false }, // 학생의 답변 (선택지 인덱스 등)
  isCorrect: { type: Boolean, required: true }, // 정답 여부 (True/False)
});

// 퀴즈 결과 스키마
const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true }, // 학생 ID

  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "KahootQuizSession", // KahootQuizSession 모델 참조
    required: true,
  },

  // quizId 필드 제거: 원본 KahootQuizContent에 대한 직접 참조 불필요

  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },

  results: [resultSchema], // 개별 질문의 결과 배열
  score: { type: Number, required: true }, // 전체 점수 (정답 개수 기반)
  createdAt: { type: Date, default: Date.now }, // 생성 날짜
});

// studentId와 sessionId의 조합이 유일하도록 복합 고유 인덱스 설정
quizResultSchema.index({ studentId: 1, sessionId: 1 }, { unique: true });

// 리포트 생성을 위한 인덱스 설정
quizResultSchema.index({ studentId: 1, semester: 1, subject: 1 });

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

module.exports = QuizResult;
