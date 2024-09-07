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
    if (student && student.tokens.length > 0) {
      const tokens = student.tokens.map(t => t.token); // 모든 토큰을 배열로 추출
      
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
      
      // FCM 메시지 전송
      console.log(message);
      const response = await admin.messaging().sendMulticast(message);
      console.log('FCM response:', response);

      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .map((resp, idx) => resp.error ? tokens[idx] : null)
          .filter(token => token !== null);
        console.log('Failed tokens:', failedTokens);
      }
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
    // 학기 정보 처리
    const semesterText = selectedSemesters.length > 1 
      ? `${selectedSemesters.slice(0, -1).join(", ")} 및 ${selectedSemesters.slice(-1)}`
      : selectedSemesters[0];

    // 과목 정보 처리
    const subjectText = selectedSubjects.length > 2
      ? `${selectedSubjects.slice(0, 2).join(", ")} 등 ${selectedSubjects.length}개 과목에 대한`
      : `${selectedSubjects.join(", ")} 과목에 대한`;

    // 학생 이름 조회 (필요한 학생 이름만 제한적으로 조회)
    const studentNames = await Student.find({ _id: { $in: selectedStudents } })
      .select('name')
      .limit(2) // 최대 2명의 이름만 조회
      .then(students => students.map(student => student.name));

    // 학생 정보 처리 (2명 이하일 경우에는 이름을 모두 표시, 초과하면 외 몇 명의 학생 추가 표시)
    const remainingCount = selectedStudents.length - studentNames.length;
    const studentText = remainingCount > 0
      ? `${studentNames.join(", ")} 외 ${remainingCount}명의 학생`
      : studentNames.join(", ");

    // 최종 메시지 생성
    const message = `${grade}학년 ${semesterText} ${subjectText} 평어가 생성되었습니다. ${studentText}의 평어를 확인해 주세요.`;

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
          title: '평어 생성 알림',
          body: message,
        },
        data: {
          notificationId: notification._id.toString(),
        },
        tokens: tokens,
      };
      console.log('FCM message:', fcmMessage);
      const response = await admin.messaging().sendMulticast(fcmMessage);
      console.log('FCM response:', response);

      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .map((resp, idx) => resp.error ? tokens[idx] : null)
          .filter(token => token !== null);
        console.log('Failed tokens:', failedTokens);
      }
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
