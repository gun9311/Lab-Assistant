const express = require('express');
const { login, logout, refreshAccessToken, registerTeacher, registerStudent, registerAdmin } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshAccessToken);

// 회원 가입
router.post('/register/teacher', registerTeacher);
router.post('/register/student', registerStudent);
router.post('/register/admin', registerAdmin); // 관리자 회원가입 엔드포인트 추가

module.exports = router;
