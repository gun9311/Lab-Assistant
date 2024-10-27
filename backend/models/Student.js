const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true }, // 출석번호
  name: { type: String, required: true },
  password: { type: String, required: true },
  grade: { type: Number, required: true },
  class: { type: String, required: true }, // 반
  school: { type: String, required: true },
  role: { type: String, default: 'student' },
  tokens: [{ token: { type: String, required: false } }], // FCM 토큰 저장
  submittedQuizzes: [{
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    submittedAt: { type: Date, default: Date.now }
  }]
});

// 복합 unique 인덱스 설정
studentSchema.index({ school: 1, grade: 1, class: 1, studentId: 1 }, { unique: true });

studentSchema.pre('save', async function(next) {
  const student = this;
  if (student.isModified('password')) {
    student.password = await bcrypt.hash(student.password, 8);
  }
  next();
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;