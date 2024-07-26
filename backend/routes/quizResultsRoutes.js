const express = require('express');
const auth = require('../middleware/auth');
const { getQuizResults } = require('../controllers/quizResultController');

const router = express.Router();

// 퀴즈 결과 내역 가져오기
router.get('/', auth('student'), getQuizResults);

module.exports = router;
