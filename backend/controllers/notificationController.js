const Notification = require("../models/Notification");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const admin = require("firebase-admin");
const logger = require("../utils/logger");

// 알림 생성 및 푸시 알림 전송
const sendPushNotification = async (
  message,
  tokens,
  attempt = 1,
  maxAttempts = 3
) => {
  try {
    const response = await admin.messaging().sendMulticast(message);
    logger.debug("FCM response:", response);

    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((resp, idx) =>
          resp.error ? { token: tokens[idx], error: resp.error } : null
        )
        .filter((item) => item !== null);

      logger.warn("Failed tokens with errors:", failedTokens);

      const invalidTokens = failedTokens
        .filter(
          (item) =>
            item.error.code === "messaging/invalid-registration-token" ||
            item.error.code === "messaging/unregistered"
        )
        .map((item) => item.token);

      if (invalidTokens.length > 0) {
        logger.info(
          "Invalid tokens detected and will be removed:",
          invalidTokens
        );
        await handleInvalidTokens(
          invalidTokens,
          message.data.recipientType === "Student" ? Student : Teacher
        );
      }

      const retryableTokens = failedTokens
        .filter(
          (item) =>
            item.error.code !== "messaging/invalid-registration-token" &&
            item.error.code !== "messaging/unregistered"
        )
        .map((item) => item.token);

      if (retryableTokens.length > 0 && attempt < maxAttempts) {
        const backoffTime = Math.pow(2, attempt) * 1000;
        logger.info(
          `Retrying in ${backoffTime / 1000} seconds... Attempt ${attempt + 1}`
        );
        const modelForRetry =
          message.data.recipientType === "Student" ? Student : Teacher;
        setTimeout(
          () =>
            sendPushNotification(
              message,
              retryableTokens,
              attempt + 1,
              maxAttempts,
              modelForRetry
            ),
          backoffTime
        );
      } else if (retryableTokens.length > 0) {
        logger.warn(
          "Max retry attempts reached for some tokens. No further action will be taken."
        );
      }
    }
  } catch (error) {
    logger.error("Failed to send push notification:", {
      error: error.message,
      stack: error.stack,
      tokens,
      attempt,
    });
    if (attempt < maxAttempts) {
      const backoffTime = Math.pow(2, attempt) * 1000;
      logger.info(
        `Retrying in ${backoffTime / 1000} seconds due to error... Attempt ${
          attempt + 1
        }`
      );
      const modelForRetry =
        message.data.recipientType === "Student" ? Student : Teacher;
      setTimeout(
        () =>
          sendPushNotification(
            message,
            tokens,
            attempt + 1,
            maxAttempts,
            modelForRetry
          ),
        backoffTime
      );
    } else {
      logger.warn("Max retry attempts reached after error.");
    }
  }
};

const handleInvalidTokens = async (failedTokens, Model) => {
  if (!Model) {
    logger.error("handleInvalidTokens called without a valid Model.");
    return;
  }
  try {
    for (const token of failedTokens) {
      await Model.updateOne(
        { "tokens.token": token },
        { $pull: { tokens: { token } } }
      );
      logger.info(
        `Invalid FCM token removed from ${Model.modelName}: ${token}`
      );
    }
  } catch (error) {
    logger.error(`Failed to remove invalid tokens from ${Model.modelName}:`, {
      error: error.message,
      stack: error.stack,
      tokens: failedTokens,
    });
  }
};

const sendQuizResultNotification = async (req, res, next) => {
  const { studentId, quizId, subject, semester, unit } = req.body;

  try {
    const notification = new Notification({
      recipientId: studentId,
      recipientType: "Student",
      message: `퀴즈 결과가 준비되었습니다: ${subject} - ${unit}`,
      type: "quiz_result",
      data: { quizId, recipientType: "Student" },
    });

    await notification.save();

    const student = await Student.findById(studentId);
    if (student && student.tokens.length > 0) {
      const tokens = student.tokens.map((t) => t.token);

      const message = {
        notification: {
          title: "퀴즈 결과 알림",
          body: `퀴즈 결과가 준비되었습니다: ${subject} - ${unit}. 확인해보세요!`,
        },
        data: {
          notificationId: notification._id.toString(),
          recipientType: "Student",
        },
        tokens: tokens,
      };

      await sendPushNotification(message, tokens);
    }

    res.status(200).send({ message: "알림이 성공적으로 전송되었습니다." });
  } catch (error) {
    logger.error("Failed to create quiz result notification:", {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    const err = new Error(
      "퀴즈 결과 알림 생성에 실패했습니다. 나중에 다시 시도해주세요."
    );
    err.statusCode = 500;
    next(err);
  }
};

const sendReportGeneratedNotification = async (req, res, next) => {
  const { teacherId, reportDetails } = req.body;
  const { grade, selectedSemesters, selectedSubjects, selectedStudents } =
    reportDetails;

  try {
    const semesterText =
      selectedSemesters.length > 1
        ? `${selectedSemesters
            .slice(0, -1)
            .join(", ")} 및 ${selectedSemesters.slice(-1)}`
        : selectedSemesters[0];

    const subjectText =
      selectedSubjects.length > 2
        ? `${selectedSubjects.slice(0, 2).join(", ")} 등 ${
            selectedSubjects.length
          }개 과목에 대한`
        : `${selectedSubjects.join(", ")} 과목에 대한`;

    const studentNames = await Student.find({ _id: { $in: selectedStudents } })
      .select("name")
      .limit(2)
      .then((students) => students.map((student) => student.name));

    const remainingCount = selectedStudents.length - studentNames.length;
    const studentText =
      remainingCount > 0
        ? `${studentNames.join(", ")} 외 ${remainingCount}명의 학생`
        : studentNames.join(", ");

    const messageBody = `${grade}학년 ${semesterText} ${subjectText} 평어가 생성되었습니다. ${studentText}의 평어를 확인해 주세요.`;

    const notification = new Notification({
      recipientId: teacherId,
      recipientType: "Teacher",
      message: messageBody,
      type: "report_generated",
      data: { ...reportDetails, recipientType: "Teacher" },
    });

    await notification.save();

    const teacher = await Teacher.findById(teacherId);
    if (teacher && teacher.tokens.length > 0) {
      const tokens = teacher.tokens.map((t) => t.token);

      const fcmMessage = {
        notification: {
          title: "평어 생성 알림",
          body: messageBody,
        },
        data: {
          notificationId: notification._id.toString(),
          recipientType: "Teacher",
        },
        tokens: tokens,
      };

      await sendPushNotification(fcmMessage, tokens);
    }

    res.status(200).send({ message: "알림이 성공적으로 전송되었습니다." });
  } catch (error) {
    logger.error("Failed to send report generated notification to teacher:", {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    const err = new Error(
      "평어 생성 알림 전송에 실패했습니다. 나중에 다시 시도해주세요."
    );
    err.statusCode = 500;
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user._id,
    }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    logger.error("Failed to fetch notifications:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
    });
    const err = new Error(
      "알림을 불러오는데 실패했습니다. 나중에 다시 시도해주세요."
    );
    err.statusCode = 500;
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  const { id } = req.params;

  try {
    await Notification.updateOne(
      { _id: id, recipientId: req.user._id },
      { read: true }
    );
    res.status(200).send({ message: "알림을 읽음으로 표시했습니다." });
  } catch (error) {
    logger.error("Failed to mark notification as read:", {
      error: error.message,
      stack: error.stack,
      notificationId: id,
      userId: req.user._id,
    });
    const err = new Error(
      "알림을 읽음으로 표시하는데 실패했습니다. 나중에 다시 시도해주세요."
    );
    err.statusCode = 500;
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, read: false },
      { read: true }
    );
    res.status(200).send({ message: "모든 알림을 읽음으로 표시했습니다." });
  } catch (error) {
    logger.error("Failed to mark all notifications as read:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
    });
    const err = new Error(
      "모든 알림을 읽음으로 표시하는데 실패했습니다. 나중에 다시 시도해주세요."
    );
    err.statusCode = 500;
    next(err);
  }
};

module.exports = {
  sendQuizResultNotification,
  sendReportGeneratedNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
};
