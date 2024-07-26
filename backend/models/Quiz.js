const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskText: { type: String, required: true }, // 문제 텍스트
  correctAnswer: { type: String, required: true } // 정답
});

const quizSchema = new mongoose.Schema({
  grade: { type: String, required: true }, // 학년
  semester: { type: String, required: true }, // 학기
  subject: { type: String, required: true }, // 과목
  unit: { type: String, required: true }, // 단원
  tasks: [taskSchema] // 문제들
});

// 복합 유일 인덱스 설정
quizSchema.index({ grade: 1, semester: 1, subject: 1, unit: 1 }, { unique: true });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
