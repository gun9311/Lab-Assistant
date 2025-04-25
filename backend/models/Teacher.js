const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger"); // 로거 추가

const teacherSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  school: { type: String, required: true },
  role: { type: String, default: "teacher" },
  tokens: [{ token: { type: String, required: false } }], // FCM 토큰 저장 (required: false로 변경 고려)
});

teacherSchema.pre("save", async function (next) {
  const teacher = this;
  // 비밀번호 필드가 존재하고, 수정되었을 때만 해싱 수행
  if (teacher.password && teacher.isModified("password")) {
    try {
      // 라운드 수를 12로 변경
      teacher.password = await bcrypt.hash(teacher.password, 12);
      logger.info(`Password hashed for teacher: ${teacher.email}`);
    } catch (error) {
      logger.error(`Error hashing password for teacher ${teacher.email}:`, {
        error: error.message,
        stack: error.stack,
      });
      return next(error); // 에러 발생 시 다음 미들웨어/저장 로직 중단
    }
  }
  next();
});

// --- 인덱스 정의 ---
// 기본적으로 email은 unique하므로 MongoDB가 자동으로 인덱스 생성
// teacherSchema.index({ email: 1 }, { unique: true }); // 필요시 명시적으로 추가 가능

// *** 추가: FCM 토큰 검색 성능 향상을 위한 인덱스 ***
teacherSchema.index({ "tokens.token": 1 });

const Teacher = mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
