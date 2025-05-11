const redisClient = require("./redisClient"); // 기존 Redis 클라이언트 인스턴스
const logger = require("./logger");

/**
 * Redis에서 키에 해당하는 값을 가져와 JSON으로 파싱합니다.
 * 값이 없거나 파싱에 실패하면 null을 반환합니다.
 * @param {string} key - 조회할 Redis 키
 * @returns {Promise<Object|null>} 파싱된 JSON 객체 또는 null
 */
const redisJsonGet = async (key) => {
  try {
    const jsonData = await redisClient.get(key);
    if (jsonData) {
      return JSON.parse(jsonData);
    }
    return null;
  } catch (error) {
    logger.error(`Error parsing JSON from Redis for key ${key}:`, error);
    return null; // 파싱 오류 시 null 반환
  }
};

/**
 * 데이터를 JSON 문자열로 변환하여 Redis에 저장합니다.
 * @param {string} key - 저장할 Redis 키
 * @param {Object} data - 저장할 JavaScript 객체
 * @param {Object} [options=null] - Redis SET 명령어의 옵션 (예: { EX: 3600 })
 * @returns {Promise<string|null>} Redis SET 명령어의 결과 또는 에러 시 null
 */
const redisJsonSet = async (key, data, options = null) => {
  try {
    const jsonData = JSON.stringify(data);
    if (options) {
      return await redisClient.set(key, jsonData, options);
    }
    return await redisClient.set(key, jsonData);
  } catch (error) {
    logger.error(
      `Error stringifying or setting JSON to Redis for key ${key}:`,
      error
    );
    return null; // 직렬화 또는 저장 오류 시 null 반환
  }
};

module.exports = {
  redisJsonGet,
  redisJsonSet,
};
