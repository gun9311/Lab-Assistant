const express = require('express');
const { sendQuizResultNotification, sendReportGeneratedNotification, getNotifications, markAsRead } = require('../controllers/notificationController');
const router = express.Router();
const auth = require('../middleware/auth');

// 퀴즈 결과 알림 전송
router.post('/quiz-result', sendQuizResultNotification);

router.post('/report-generated', sendReportGeneratedNotification);

// 사용자의 알림 목록 가져오기
router.get('/', auth(), getNotifications);

// 특정 알림을 읽음으로 표시
router.patch('/:id/read', auth(), markAsRead);

module.exports = router;
