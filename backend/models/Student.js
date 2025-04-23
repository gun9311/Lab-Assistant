const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger"); // 로거 추가

const studentSchema = new mongoose.Schema({
  loginId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true }, // 출석번호
  name: { type: String, required: true },
  password: { type: String, required: true },
  grade: { type: Number, required: true },
  class: { type: String, required: true }, // 반
  school: { type: String, required: true },
  role: { type: String, default: "student" },
  tokens: [{ token: { type: String, required: false } }], // FCM 토큰 저장
  dailyChatCount: { type: Number, default: 0 },
  lastChatDay: { type: String, default: null }, // 예: "YYYY-MM-DD"
  monthlyChatCount: { type: Number, default: 0 },
  lastChatMonth: { type: String, default: null }, // 예: "YYYY-MM"
});

studentSchema.pre("save", async function (next) {
  const student = this;
  if (student.isModified("password")) {
    try {
      student.password = await bcrypt.hash(student.password, 12);
      logger.info(`Password hashed for student: ${student.loginId}`);
    } catch (error) {
      logger.error(`Error hashing password for student ${student.loginId}:`, {
        error: error.message,
        stack: error.stack,
      });
      return next(error);
    }
  }
  next();
});

studentSchema.index({ loginId: 1 }, { unique: true });
studentSchema.index({ school: 1, grade: 1, class: 1, loginId: 1 });

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
