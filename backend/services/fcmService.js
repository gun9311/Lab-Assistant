// services/fcmService.js
const admin = require('firebase-admin');
require('dotenv').config();
// JSON 파일에서 민감한 정보(프라이빗 키)만 환경 변수로 대체
const serviceAccount = {
    "type": "service_account",
    "project_id": "lab-assistant-6f161",
    "private_key_id": "4bdfe770bfa0f077f69495c0b08f251077883e35",
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // 환경 변수로부터 프라이빗 키를 가져옴
    "client_email": "firebase-adminsdk-y1dic@lab-assistant-6f161.iam.gserviceaccount.com",
    "client_id": "103641726869997430687",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-y1dic%40lab-assistant-6f161.iam.gserviceaccount.com"
  };

// console.log(serviceAccount); // 환경 변수가 제대로 파싱되었는지 확인
if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }  

const sendNotification = async (token, message) => {
  try {
    const response = await admin.messaging().send({
      token: token,
      notification: message,
    });
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

module.exports = {
  sendNotification,
};
