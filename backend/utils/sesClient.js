const { SESClient } = require("@aws-sdk/client-ses");
const logger = require("./logger"); // 로거 가져오기

// SES 클라이언트 인스턴스를 생성합니다.
const sesClient = new SESClient({
  region: process.env.AWS_REGION, // 환경 변수에서 리전 가져오기
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // 환경 변수 사용
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // 환경 변수 사용
  },
});

logger.info("SES Client initialized"); // 초기화 로그 추가

// 생성된 인스턴스를 내보냅니다.
module.exports = sesClient;
