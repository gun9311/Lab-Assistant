const logger = require("../utils/logger");
const { DateTime } = require("luxon"); // 시간대 처리를 위해 luxon 라이브러리 사용 (설치 필요: npm install luxon)
const config = require("../config"); // 설정 파일 로드

const checkServiceTime = (req, res, next) => {
  // 이 미들웨어는 auth 미들웨어 뒤에 실행되어 req.user가 있다고 가정
  if (!req.user || req.user.role !== "student") {
    // 학생이 아닌 경우 이 미들웨어를 통과
    return next();
  }

  // --- 하드코딩된 시간 설정 ---
  // const startHour = 8; // 오전 9시 // 삭제
  // const endHour = 23; // 오후 3시 (15시 전까지 허용) // 삭제
  // const serverTimezone = "Asia/Seoul"; // 시간대 고정 // 삭제
  // --- 하드코딩 끝 ---
  const { START_HOUR, END_HOUR, SERVER_TIMEZONE } = config.studentServiceHours; // 설정값 사용

  try {
    // 서버의 현재 시간을 지정된 시간대 기준으로 가져옴
    const now = DateTime.now().setZone(SERVER_TIMEZONE); // 수정됨
    const currentHour = now.hour;

    // 이용 가능 시간인지 확인 (endHour는 포함하지 않음)
    const isAvailable = currentHour >= START_HOUR && currentHour < END_HOUR; // 수정됨

    if (!isAvailable) {
      logger.warn(
        `Student ${req.user._id} access denied due to unavailable time. Current hour: ${currentHour} (Timezone: ${SERVER_TIMEZONE})` // 수정됨
      );
      // API 요청의 경우 403 Forbidden 반환
      // 웹소켓 요청의 경우, 이 미들웨어를 직접 사용하기보다 연결 핸들러 내에서 이 로직을 호출해야 함
      return res.status(403).send({
        error: "service_unavailable_time",
        message: `서비스 이용 가능 시간이 아닙니다. (이용 시간: ${START_HOUR}:00 ~ ${END_HOUR}:00)`, // 수정됨
      });
    }

    // 이용 가능 시간대면 다음 미들웨어 또는 라우트 핸들러로 진행
    next();
  } catch (error) {
    logger.error(
      `Error checking service time for student ${req.user._id}:`,
      error
    );
    // 시간 확인 중 오류 발생 시, 안전하게 접근 거부
    return res.status(500).send({
      error: "time_check_error",
      message: "서비스 시간 확인 중 오류가 발생했습니다.",
    });
  }
};

module.exports = checkServiceTime;
