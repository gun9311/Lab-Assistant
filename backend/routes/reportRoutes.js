const express = require('express');
const { generateReport } = require('../controllers/reportController');
const auth = require('../middleware/auth'); // 인증 미들웨어

const router = express.Router();

// 보고서 생성 라우트
router.post('/generate', auth('teacher'), generateReport);

module.exports = router;
