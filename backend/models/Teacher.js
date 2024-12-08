const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  school: { type: String, required: true },
  role: { type: String, default: 'teacher' },
  tokens: [{ token: { type: String, required: true } }], // FCM 토큰 저장
});

teacherSchema.pre('save', async function(next) {
  const teacher = this;
  if (teacher.isModified('password')) {
    teacher.password = await bcrypt.hash(teacher.password, 8);
  }
  next();
});

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;
