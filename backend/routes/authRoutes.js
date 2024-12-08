const express = require('express');
const { googleLogin, completeRegistration, login, logout, refreshAccessToken, registerTeacher, registerStudent, registerAdmin, registerStudentByTeacher, forgotPassword, resetPassword, forgotStudentPassword,resetStudentPassword } = require('../controllers/authController');
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

// 구글 oauth
router.post('/google', googleLogin);
router.post('/google/complete-registration', completeRegistration);

// 비밀번호 찾기 및 재설정
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/forgot-student-password' , auth('teacher'), forgotStudentPassword);
router.post('/reset-student-password', resetStudentPassword);

module.exports = router;
