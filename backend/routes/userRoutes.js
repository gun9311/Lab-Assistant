const express = require("express");
const {
  getStudents,
  getProfile,
  updateProfile,
  deleteProfile,
  getChatUsage,
  // --- 새 컨트롤러 함수 임포트 ---
  getStudentByLoginId, // 학생 ID로 조회
  updateStudentByTeacher, // 교사에 의한 학생 정보 수정
  resetStudentPasswordByTeacher, // 교사에 의한 학생 비번 초기화
  deleteStudentByTeacher, // 교사에 의한 학생 삭제
} = require("../controllers/userController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/teacher/students", auth("teacher"), getStudents);
router.get("/profile", auth(["student", "teacher"]), getProfile);
router.put("/profile", auth(["student", "teacher"]), updateProfile);
// 기존 deleteProfile은 본인 계정 삭제용으로 유지
router.delete("/profile", auth(["student", "teacher"]), deleteProfile);
router.get("/chat-usage", auth("student"), getChatUsage);

// --- 교사용 학생 관리 API 추가 ---
// GET /api/users/teacher/student?loginId=...
router.get("/teacher/student", auth("teacher"), getStudentByLoginId);
// PUT /api/users/teacher/student/:studentId
router.put(
  "/teacher/student/:studentId",
  auth("teacher"),
  updateStudentByTeacher
);
// POST /api/users/teacher/student/:studentId/reset-password
router.post(
  "/teacher/student/:studentId/reset-password",
  auth("teacher"),
  resetStudentPasswordByTeacher
);
// DELETE /api/users/teacher/student/:studentId
router.delete(
  "/teacher/student/:studentId",
  auth("teacher"),
  deleteStudentByTeacher
);
// --- 추가 끝 ---

module.exports = router;
