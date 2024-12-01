const express = require('express');
const { login, logout, refreshAccessToken, registerTeacher, registerStudent, registerAdmin, registerStudentByTeacher } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshAccessToken);

// 회원 가입
router.post('/register/teacher', registerTeacher);
router.post('/register/student', registerStudent);
router.post('/register/admin', registerAdmin); // 관리자 회원가입 엔드포인트 추가

// 교사가 학생 계정 생성
router.post('/register/studentByTeacher', auth('teacher'), registerStudentByTeacher);

module.exports = router;
