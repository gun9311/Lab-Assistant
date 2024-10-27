const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuestionSchema = new Schema({
  questionText: { type: String, required: true },
  questionType: { type: String, enum: ['multiple-choice', 'true-false'], required: true },
  options: [{
    text: { type: String },
    imageUrl: { type: String }, // 선택지 이미지에 사용될 URL
  }],
  correctAnswer: { type: String, required: true },
  timeLimit: { type: Number, default: 30 },
  imageUrl: { type: String },  // 문제 이미지 URL
});

const KahootQuizContentSchema = new Schema({
  title: { type: String, required: true },
  grade: { type: Number, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },
  questions: [QuestionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  likeCount: { type: Number, default: 0 },
  imageUrl: { type: String },  // 퀴즈 전체 이미지 URL
});


module.exports = mongoose.model('KahootQuizContent', KahootQuizContentSchema);
