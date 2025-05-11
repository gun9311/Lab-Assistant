/**
 * S3 파일 키를 기반으로 전체 S3 URL을 생성합니다.
 * @param {string} fileKey - S3에 저장된 파일의 키 (예: 'timestamp-filename.jpg')
 * @returns {string} 전체 S3 파일 URL
 */
const getS3FileUrl = (fileKey) => {
  if (!fileKey) {
    return null;
  }
  // process.env.S3_BUCKET_NAME이 설정되어 있는지 확인하는 것이 좋습니다.
  // 여기서는 간단하게 바로 사용합니다.
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${fileKey}`;
};

module.exports = {
  getS3FileUrl,
};
