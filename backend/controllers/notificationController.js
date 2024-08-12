const Notification = require('../models/Notification');
const Student = require('../models/Student');
const admin = require('firebase-admin');

// 알림 생성 및 푸시 알림 전송
const sendQuizResultNotification = async (req, res) => {
  const { studentId, quizId, subject, semester, unit } = req.body;

  try {
    // 알림 생성
    const notification = new Notification({
      recipientId: studentId,
      recipientType: 'Student', // 학생에게 알림을 보냄
      message: `퀴즈 결과가 준비되었습니다: ${subject} - ${unit}`,
      type: 'quiz_result',
      data: { quizId },
    });

    await notification.save();

    // FCM을 통해 푸시 알림 전송
    const student = await Student.findById(studentId);
    console.log(student);
    if (student && student.tokens.length > 0) {
      const tokens = student.tokens.map(t => t.token); // 모든 토큰을 배열로 추출
      console.log(tokens);
      
      const message = {
        notification: {
          title: '퀴즈 결과 알림',
          body: `퀴즈 결과가 준비되었습니다: ${subject} - ${unit}. 확인해보세요!`,
        },
        data: {
          notificationId: notification._id.toString(), // 생성된 알림의 ID를 포함
        },
        tokens: tokens, // 토큰 배열을 설정
      };
      
      await admin.messaging().sendMulticast(message);
    }

    res.status(200).send({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Failed to create notification:', error);
    res.status(500).send({ message: 'Failed to create notification' });
  }
};

// 사용자의 알림 목록 가져오기
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).send({ message: 'Failed to fetch notifications' });
  }
};

// 특정 알림을 읽음으로 표시
const markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    await Notification.findByIdAndUpdate(id, { read: true });
    res.status(200).send({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).send({ message: 'Failed to mark notification as read' });
  }
};

module.exports = {
  sendQuizResultNotification,
  getNotifications,
  markAsRead,
};
