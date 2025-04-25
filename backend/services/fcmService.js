// services/fcmService.js
const admin = require("firebase-admin");
require("dotenv").config();
const logger = require("../utils/logger"); // logger 추가
// JSON 파일에서 민감한 정보(프라이빗 키)만 환경 변수로 대체
const serviceAccount = {
  type: "service_account",
  project_id: "lab-assistant-6f161",
  private_key_id: "4bdfe770bfa0f077f69495c0b08f251077883e35",
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // 환경 변수로부터 프라이빗 키를 가져옴
  client_email:
    "firebase-adminsdk-y1dic@lab-assistant-6f161.iam.gserviceaccount.com",
  client_id: "103641726869997430687",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-y1dic%40lab-assistant-6f161.iam.gserviceaccount.com",
};

// console.log(serviceAccount); // 제거
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Custom Error for invalid FCM tokens
class InvalidFcmTokenError extends Error {
  constructor(token, message) {
    super(message || `Invalid or unregistered FCM token: ${token}`);
    this.name = "InvalidFcmTokenError";
    this.invalidToken = token;
  }
}

const sendNotification = async (token, message) => {
  try {
    const response = await admin.messaging().send({
      token: token,
      notification: message,
      // Optional: Add APNS/Android specific configurations for delivery priority, etc.
      // apns: { headers: { 'apns-priority': '10' } },
      // android: { priority: 'high' }
    });
    // *** 변경: console.log -> logger.debug ***
    logger.debug("Successfully sent FCM message:", { response, token }); // 상세 정보는 debug
    return { success: true, response };
  } catch (error) {
    // Check for specific error codes indicating an invalid token
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      // *** 변경: console.error -> logger.warn *** (토큰 무효는 경고 수준)
      logger.warn(
        `FCM token ${token} is invalid or unregistered. Marking for removal.`,
        { errorCode: error.code }
      );
      // Throw a specific error that the caller can catch
      throw new InvalidFcmTokenError(token, error.message);
    } else {
      // Log other errors and potentially re-throw or return an error status
      // *** 변경: console.error -> logger.error ***
      logger.error("Error sending FCM message:", {
        error: error.message,
        stack: error.stack,
        token,
        message,
      });
      // Consider re-throwing a generic error or returning a failure status
      throw error; // Or return { success: false, error: error };
    }
  }
};

module.exports = {
  sendNotification,
  InvalidFcmTokenError, // Export the custom error class
};
