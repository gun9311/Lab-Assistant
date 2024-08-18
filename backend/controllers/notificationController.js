const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
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

const sendReportGeneratedNotification = async (req, res) => {
  const { teacherId, reportDetails } = req.body;
  const { grade, selectedSemesters, selectedSubjects, selectedStudents } = reportDetails;

  try {
    // 학기, 과목, 학생 정보를 바탕으로 메시지 작성
    const semesterText = selectedSemesters.join(", ");
    const subjectText = selectedSubjects.length > 2
      ? `${selectedSubjects.slice(0, 2).join(", ")} 외 ${selectedSubjects.length - 2}개 과목`
      : selectedSubjects.join(", ");
    const studentText = selectedStudents.length > 2
      ? `${selectedStudents.length}명`
      : `${selectedStudents.length}명의 학생`;

    const message = `${grade}학년 ${semesterText} ${subjectText} 과목, ${studentText}에 대한 리포트 생성이 완료되었습니다.`;

    // 알림 생성
    const notification = new Notification({
      recipientId: teacherId,
      recipientType: 'Teacher', 
      message: message,
      type: 'report_generated',
      data: reportDetails,
    });

    await notification.save();

    // FCM을 통해 푸시 알림 전송
    const teacher = await Teacher.findById(teacherId);
    if (teacher && teacher.tokens.length > 0) {
      const tokens = teacher.tokens.map(t => t.token);
      
      const fcmMessage = {
        notification: {
          title: '리포트 생성 알림',
          body: message,
        },
        data: {
          notificationId: notification._id.toString(),
        },
        tokens: tokens,
      };
      
      await admin.messaging().sendMulticast(fcmMessage);
    }

    res.status(200).send({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Failed to send notification to teacher:', error);
    res.status(500).send({ message: 'Failed to send notification' });
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

// 모든 알림을 읽음으로 표시
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipientId: req.user._id, read: false }, { read: true });
    res.status(200).send({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    res.status(500).send({ message: 'Failed to mark all notifications as read' });
  }
};

module.exports = {
  sendQuizResultNotification,
  sendReportGeneratedNotification,
  getNotifications,
  markAsRead,
  markAllAsRead, // 추가
};
