const jwt = require("jsonwebtoken");
const { URLSearchParams } = require("url"); // Node.js 내장 모듈
const logger = require("./utils/logger");
const { DateTime } = require("luxon");
const config = require("./config");
const { initializeChatConnection } = require("./handlers/chatbotWebSocketHandler");
const { handleTeacherWebSocketConnection } = require("./handlers/kahootTeacherWebSocketHandler");
const { handleStudentWebSocketConnection } = require("./handlers/kahootStudentWebSocketHandler");
const {redisClient} = require("./utils/redisClient"); // Kahoot에서 Redis 사용 시 필요할 수 있음

const { START_HOUR, END_HOUR, SERVER_TIMEZONE } = config.studentServiceHours;

function handleNewWebSocketConnection(ws, req) {
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const token = urlParams.get("token");
  const pin = urlParams.get("pin");
  const subject = urlParams.get("subject");

  if (!token) {
    // ... (토큰 누락 처리)
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      // ... (JWT 오류 처리)
      return;
    }

    ws.user = user;
    logger.info(
      `WebSocket connection attempt by user: ${user._id}, role: ${user.role}`
    );

    if (user.role === "student") {
      try {
        const now = DateTime.now().setZone(SERVER_TIMEZONE);
        const currentHour = now.hour;
        const isAvailable = currentHour >= START_HOUR && currentHour < END_HOUR;
        if (!isAvailable) {
          // ... (서비스 시간 제한 처리)
          return;
        }
      } catch (timeError) {
        // ... (시간 확인 오류 처리)
        return;
      }
    }

    logger.info(`WebSocket connection established for user: ${user._id}`);

    if (subject) {
      logger.info("Chat WebSocket connection routing.");
      initializeChatConnection(ws, user._id, subject);
    } else if (pin) {
      // Kahoot 퀴즈 로직
      // (주의: kahootQuizController가 Redis를 사용한다면, 여기서 redisClient를 어떻게 넘겨줄지 또는 해당 핸들러가 직접 import할지 결정 필요)
      // 현재 handleTeacherWebSocketConnection 등은 redisClient를 직접 import하지 않고, 내부에서 로직 수행 중 session을 redis에서 가져옴.
      // 따라서 아래 코드는 redisClient를 직접 전달하지 않아도 될 수 있음.
      let sessionData = await redisClient.get(`session:${pin}`);
      if (!sessionData) {
        ws.send(
          JSON.stringify({ error: "Session not found in Redis for PIN" })
        );
        logger.warn(
          `Session not found in Redis for pin: ${pin} during initial connection.`
        );
        ws.close();
        return;
      }
      // sessionData 파싱 및 사용은 각 핸들러 내부에서 진행
      logger.info(`User ${user._id} attempting to join Kahoot session ${pin}`);
      if (user.role === "teacher") {
        logger.info("Teacher Kahoot WebSocket routing.");
        handleTeacherWebSocketConnection(ws, user._id, pin);
      } else if (user.role === "student") {
        logger.info("Student Kahoot WebSocket routing.");
        handleStudentWebSocketConnection(ws, user._id, pin);
      } else {
        // ... (잘못된 역할 처리)
      }
    } else {
      // ... (필수 파라미터 누락 처리)
    }
  });
}

module.exports = { handleNewWebSocketConnection };
