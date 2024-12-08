const express = require('express');
const auth = require('../middleware/auth');
const { getQuizResults, getQuizResultsByStudentId, getQuizDetails } = require('../controllers/quizResultController');

const router = express.Router();

// 학생의 퀴즈 결과 내역 가져오기
router.get('/', auth('student'), getQuizResults);

// 교사가 특정 학생의 퀴즈 결과 내역 가져오기
router.get('/:studentId', auth(), getQuizResultsByStudentId);

// 특정 퀴즈의 상세 데이터 가져오기
router.get('/details/:quizId/:studentId', auth(), getQuizDetails);

module.exports = router;
