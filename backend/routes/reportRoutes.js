const express = require('express');
const { generateReport, queryReport } = require('../controllers/reportController');
const auth = require('../middleware/auth'); // 인증 미들웨어

const router = express.Router();

// 보고서 생성 라우트
router.post('/generate', auth('teacher'), generateReport);
router.post('/query', auth('teacher'), queryReport);


module.exports = router;
