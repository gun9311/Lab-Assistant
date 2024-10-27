const { S3Client } = require('@aws-sdk/client-s3');

// S3 클라이언트 생성
const s3 = new S3Client({
  region: process.env.S3_REGION, // S3 리전 설정
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

module.exports = s3;