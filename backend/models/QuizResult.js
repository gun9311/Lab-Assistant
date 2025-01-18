const mongoose = require("mongoose");
const { Schema } = mongoose;

// 개별 문제의 결과 스키마
const resultSchema = new mongoose.Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: "KahootQuizContent.questions",
    required: true,
  }, // 퀴즈 문제 ID
  studentAnswer: { type: Number, required: false }, // 학생의 답변
  isCorrect: { type: Boolean, required: true }, // 정답 여부 (True/False)
});

// 퀴즈 결과 스키마
const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true }, // 학생 ID
  quizId: {
    type: Schema.Types.ObjectId,
    ref: "KahootQuizContent",
    required: true,
  }, // 고유 제약 조건 추가
  subject: { type: String, required: true }, // 과목
  semester: { type: String, required: true }, // 학기
  unit: { type: String, required: true }, // 단원
  results: [resultSchema], // 개별 질문의 결과 배열
  score: { type: Number, required: true }, // 전체 점수 (정답 개수 기반)
  createdAt: { type: Date, default: Date.now }, // 생성 날짜
});

// studentId와 quizId의 조합이 유일하도록 복합 고유 인덱스 설정
quizResultSchema.index({ studentId: 1, quizId: 1 }, { unique: true });

// 리포트 생성을 위한 인덱스 설정
quizResultSchema.index({ studentId: 1, semester: 1, subject: 1 });

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

module.exports = QuizResult;
