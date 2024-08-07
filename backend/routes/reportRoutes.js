const express = require('express');
const { generateReport, queryReport, getStudentReports } = require('../controllers/reportController');
const auth = require('../middleware/auth'); // 인증 미들웨어

const router = express.Router();

// 보고서 생성 라우트
router.post('/generate', auth('teacher'), generateReport);
// 보고서 조회 라우트
router.post('/query', auth('teacher'), queryReport);
// 특정 학생 보고서 조회 라우트
router.post('/student', auth('teacher'), getStudentReports);


module.exports = router;
