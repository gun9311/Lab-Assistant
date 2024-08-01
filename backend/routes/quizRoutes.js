const express = require('express');
const { submitQuiz, addQuiz, getQuiz } = require('../controllers/quizController');
const auth = require('../middleware/auth');
require('dotenv').config(); // dotenv 패키지를 사용하여 환경 변수를 로드합니다.

const router = express.Router();

// 라우터 설정
router.post('/submit', auth('student'), submitQuiz);
router.get('/', auth('student'), getQuiz); // 퀴즈 문제를 가져오는
router.post('/', auth('admin'), addQuiz);

module.exports = router;
