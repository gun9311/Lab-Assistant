const redisClient = require("../utils/redisClient");
const logger = require("../utils/logger");
const WebSocket = require("ws");
const { getParticipantKeysPattern } = require("../utils/redisKeys");

const kahootClients = {}; // 각 세션의 클라이언트를 저장하는 객체

const PING_INTERVAL_MS = 10000; // 핑 주기 (10초)
const PONG_TIMEOUT_MS = 5000; // 퐁 타임아웃 (5초)

const broadcastToTeacher = (pin, message) => {
  const session = kahootClients[pin]; // 해당 세션의 교사와 학생들이 저장된 객체
  if (session && session.teacher) {
    // 교사 웹소켓 연결이 있는 경우 메시지를 전송
    if (session.teacher.readyState === WebSocket.OPEN) {
      session.teacher.send(JSON.stringify(message));
      logger.info(
        `Message sent to teacher of session ${pin}: ${JSON.stringify(message)}`
      );
    } else {
      logger.warn(`Teacher for session ${pin} is not in OPEN state.`);
    }
  } else {
    logger.warn(`Teacher for session ${pin} not found.`);
  }
};

// 특정 핀(pin)으로 세션에 연결된 학생들에게 메시지 전송
const broadcastToStudents = (pin, message) => {
  // 해당 세션에 연결된 학생들이 있는지 확인
  if (kahootClients[pin] && kahootClients[pin].students) {
    // 학생 목록을 순회하며 각 WebSocket에 메시지 전송
    Object.values(kahootClients[pin].students).forEach((studentWs) => {
      if (studentWs.readyState === WebSocket.OPEN) {
        studentWs.send(JSON.stringify(message)); // 메시지를 JSON 형식으로 변환하여 전송
      }
    });
  } else {
    logger.info(
      `No students or student websockets available to broadcast for session with pin: ${pin}`
    );
  }
};

const broadcastToActiveStudents = async (pin, message) => {
  const participantKeys = await redisClient.keys(
    getParticipantKeysPattern(pin)
  );
  const activeStudentIds = participantKeys.map((key) => key.split(":")[3]); // studentId 추출

  if (kahootClients[pin] && kahootClients[pin].students) {
    Object.entries(kahootClients[pin].students).forEach(
      ([studentId, studentWs]) => {
        if (
          studentWs.readyState === WebSocket.OPEN &&
          activeStudentIds.includes(studentId)
        ) {
          studentWs.send(JSON.stringify(message));
        }
      }
    );
  } else {
    logger.info(
      `No students or student websockets available to broadcast actively for session with pin: ${pin}`
    );
  }
};

// 웹소켓 연결 유지 (Keep-Alive) 로직
function setupKeepAlive(ws, pin, clientType) {
  let isAlive = true;
  let pongTimeout;

  ws.on("pong", () => {
    isAlive = true;
    clearTimeout(pongTimeout);
  });

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!isAlive) {
        logger.warn(
          `${clientType} connection for pin ${pin} did not respond to ping, terminating connection.`
        );
        ws.terminate(); // 연결 종료
        clearInterval(pingInterval); // 인터벌 정리
        clearTimeout(pongTimeout); // 타임아웃 정리
        return;
      }
      isAlive = false;
      ws.ping();
      // logger.info(`Ping sent to ${clientType} for pin ${pin}`); // 상세 로그가 너무 많을 수 있어 주석 처리 또는 레벨 조정 고려

      pongTimeout = setTimeout(() => {
        if (!isAlive) {
          logger.warn(
            `${clientType} connection for pin ${pin} did not respond to pong within ${
              PONG_TIMEOUT_MS / 1000
            } seconds, terminating connection.`
          );
          ws.terminate(); // 연결 종료
          clearInterval(pingInterval); // 인터벌 정리
        }
      }, PONG_TIMEOUT_MS);
    } else {
      // WebSocket이 OPEN 상태가 아니면 인터벌 및 타임아웃 정리
      clearInterval(pingInterval);
      clearTimeout(pongTimeout);
    }
  }, PING_INTERVAL_MS);

  // WebSocket 연결이 닫히거나 에러 발생 시 인터벌 정리
  ws.on("close", () => {
    clearInterval(pingInterval);
    clearTimeout(pongTimeout);
    logger.info(
      `${clientType} connection for pin ${pin} closed. Keep-alive stopped.`
    );
  });

  ws.on("error", (error) => {
    clearInterval(pingInterval);
    clearTimeout(pongTimeout);
    logger.error(
      `${clientType} connection error for pin ${pin}: ${error}. Keep-alive stopped.`
    );
  });

  return pingInterval; // 외부에서 관리할 필요는 없어 보이지만, 일단 반환
}

module.exports = {
  kahootClients,
  broadcastToTeacher,
  broadcastToStudents,
  broadcastToActiveStudents,
  setupKeepAlive,
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
};
