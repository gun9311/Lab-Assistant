const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const admin = require('firebase-admin');

// 알림 생성 및 푸시 알림 전송
const sendPushNotification = async (message, tokens, attempt = 1, maxAttempts = 3) => {
  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log('FCM response:', response);

    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((resp, idx) => (resp.error ? { token: tokens[idx], error: resp.error } : null))
        .filter(item => item !== null);

      console.log('Failed tokens with errors:', failedTokens);

      const invalidTokens = failedTokens
        .filter(item => 
          item.error.code === 'messaging/invalid-registration-token' || 
          item.error.code === 'messaging/unregistered'
        )
        .map(item => item.token);

      if (invalidTokens.length > 0) {
        console.log('Invalid tokens detected and will be removed:', invalidTokens);
        // 무효 토큰 삭제 로직 추가
        await handleInvalidTokens(invalidTokens, Student); // 무효 토큰을 처리하는 함수 호출
      }

      const retryableTokens = failedTokens
        .filter(item => 
          item.error.code !== 'messaging/invalid-registration-token' && 
          item.error.code !== 'messaging/unregistered'
        )
        .map(item => item.token);

      if (retryableTokens.length > 0 && attempt < maxAttempts) {
        const backoffTime = Math.pow(2, attempt) * 1000; // 지수적 백오프
        console.log(`Retrying in ${backoffTime / 1000} seconds... Attempt ${attempt + 1}`);
        setTimeout(() => sendPushNotification(message, retryableTokens, attempt + 1, maxAttempts), backoffTime);
      } else if (retryableTokens.length > 0) {
        console.log('Max retry attempts reached for some tokens. No further action will be taken.');
      }
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
    if (attempt < maxAttempts) {
      const backoffTime = Math.pow(2, attempt) * 1000; // 지수적 백오프
      console.log(`Retrying in ${backoffTime / 1000} seconds due to error... Attempt ${attempt + 1}`);
      setTimeout(() => sendPushNotification(message, tokens, attempt + 1, maxAttempts), backoffTime);
    } else {
      console.log('Max retry attempts reached after error.');
    }
  }
};

const handleInvalidTokens = async (failedTokens, Model) => {
  try {
    for (const token of failedTokens) {
      // 해당 토큰을 가진 유저를 찾고 토큰 삭제
      await Model.updateOne({ 'tokens.token': token }, { $pull: { tokens: { token } } });
      console.log(`Invalid FCM token removed: ${token}`);
    }
  } catch (error) {
    console.error('Failed to remove invalid tokens:', error);
  }
};

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

      // 재시도 로직 적용
      await sendPushNotification(message, tokens);
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

    // 학생 이름 조회
    const studentNames = await Student.find({ _id: { $in: selectedStudents } })
      .select('name')
      .limit(2) // 최대 2명의 이름만 조회
      .then(students => students.map(student => student.name));

    // 학생 정보 처리
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

      // 재시도 로직 적용
      await sendPushNotification(fcmMessage, tokens);
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
