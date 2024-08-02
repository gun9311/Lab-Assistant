const mongoose = require('mongoose');
const { Schema } = mongoose;

const resultSchema = new mongoose.Schema({
  questionId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true }, // 퀴즈 문제 ID
  taskText: { type: String, required: true }, // 문제 텍스트
  correctAnswer: { type: String, required: true }, // 정답
  studentAnswer: { type: String, required: true }, // 학생의 답변
  similarity: { type: Number, required: true } // 유사도 점수 (0 ~ 100)
});

const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // 학생 ID
  subject: { type: String, required: true }, // 과목
  semester: { type: String, required: true }, // 학기
  unit: { type: String, required: true }, // 단원
  results: [resultSchema], // 개별 질문의 결과 배열
  score: { type: Number, required: true }, // 전체 점수 (평균 유사도 점수)
  createdAt: { type: Date, default: Date.now } // 생성 날짜
});

// 복합 인덱스 설정
quizResultSchema.index({ studentId: 1, subject: 1, semester: 1, unit: 1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = QuizResult;