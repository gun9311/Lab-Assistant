const redis = require("redis");
const logger = require("./logger"); // logger 모듈을 직접 가져옵니다.

// module.exports = redisClient; // 기존 export 방식 제거

// 2. redis 클라이언트 인스턴스를 생성합니다.
const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  // socket: { // 재시도 전략 등 추가 설정 가능
  //   reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
  // }
});

// 3. 가져온 logger를 사용하여 이벤트 핸들러를 설정합니다.
redisClient.on("error", (err) =>
  logger.error("Redis Client Error", {
    message: err?.message || err.toString(),
    stack: err?.stack,
  })
); // logger 사용, 에러 객체 전달

// Pub/Sub 전용 클라이언트 생성
const subscriberClient = redisClient.duplicate();

(async () => {
  try {
    await redisClient.connect();
    logger.info("Connected to Redis (Main Client)");
    await subscriberClient.connect();
    logger.info("Connected to Redis (Subscriber Client)");
  } catch (err) {
    logger.error("Failed to connect to Redis:", {
      message: err?.message || err.toString(),
      stack: err?.stack,
    });
  }
})();

// 4. 생성된 redisClient 인스턴스와 subscriberClient 인스턴스를 내보냅니다.
module.exports = {
  redisClient,
  subscriberClient,
};
