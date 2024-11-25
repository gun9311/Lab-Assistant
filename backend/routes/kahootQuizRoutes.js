const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();
const kahootQuizController = require('../controllers/kahootQuizController');

// 퀴즈 생성 (이미지 업로드를 포함)
router.post('/create', auth('teacher'), kahootQuizController.uploadQuizImage, kahootQuizController.createQuiz);

router.delete('/:quizId', auth('teacher'), kahootQuizController.deleteQuiz);

// 퀴즈 수정 (이미지 업로드를 포함)
router.put('/:id', auth('teacher'), kahootQuizController.uploadQuizImage, kahootQuizController.updateQuiz);

// 퀴즈 복제
router.post('/duplicate/:quizId', auth('teacher'), kahootQuizController.duplicateQuiz);

// 퀴즈 목록 가져오기 (새로 추가)
router.get('/list', auth('teacher'), kahootQuizController.getQuizzes);

// 세션 시작
router.post('/start-session/:quizId', auth('teacher'), kahootQuizController.startQuizSession);

// 학생 참여
router.post('/join-session', auth('student'), kahootQuizController.joinQuizSession);

// 특정 퀴즈 가져오기
router.get('/:id', auth('teacher'), kahootQuizController.getQuizById);

router.post('/:quizId/like', auth('teacher'), kahootQuizController.toggleLike);

module.exports = router;
