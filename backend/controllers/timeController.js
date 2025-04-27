const logger = require("../utils/logger");
const { DateTime } = require("luxon");

const getServiceTimeStatus = (req, res) => {
  // 역할에 관계없이 현재 서버 시간 기준 서비스 가용 상태 반환
  // 학생 역할 자체는 프론트엔드에서 이 결과를 바탕으로 처리

  // --- 하드코딩된 시간 설정 ---
  const startHour = 9; // 오전 9시
  const endHour = 15; // 오후 3시 (15시 전까지 허용)
  const serverTimezone = "Asia/Seoul"; // 시간대 고정
  // --- 하드코딩 끝 ---

  try {
    const now = DateTime.now().setZone(serverTimezone);
    const currentHour = now.hour;
    const isAvailable = currentHour >= startHour && currentHour < endHour;

    res.status(200).send({ isAvailable });
  } catch (error) {
    logger.error(`Error getting service time status:`, error);
    // 오류 발생 시 기본적으로 이용 불가 상태로 응답하는 것이 안전할 수 있음
    res
      .status(500)
      .send({ isAvailable: false, error: "Failed to check server time" });
  }
};

module.exports = {
  getServiceTimeStatus,
};
