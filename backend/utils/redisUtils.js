const { redisClient } = require("./redisClient"); // 기존 Redis 클라이언트 인스턴스
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

/**
 * Redis에서 여러 키에 해당하는 값들을 한 번의 MGET 명령으로 가져와 JSON으로 파싱합니다.
 * 각 키에 대해 값이 없거나 파싱에 실패하면 배열 내 해당 위치에 null을 포함합니다.
 * @param {string[]} keys - 조회할 Redis 키들의 배열
 * @returns {Promise<Array<Object|null>>} 파싱된 JSON 객체들의 배열 또는 null (MGET 실패 시)
 */
const redisJsonMGet = async (keys) => {
  if (!keys || keys.length === 0) {
    return [];
  }
  try {
    const jsonDatas = await redisClient.mGet(keys);
    if (jsonDatas) {
      return jsonDatas.map((jsonData, index) => {
        if (jsonData) {
          try {
            return JSON.parse(jsonData);
          } catch (error) {
            logger.error(
              `Error parsing JSON from Redis MGET for key ${keys[index]}:`,
              error
            );
            return null; // 개별 항목 파싱 오류 시 null
          }
        }
        return null; // 키에 해당하는 데이터가 없는 경우
      });
    }
    return keys.map(() => null); // MGET 결과가 null이나 undefined인 경우 (이론상 발생하기 어려움)
  } catch (error) {
    logger.error(`Error executing MGET for keys ${keys.join(", ")}:`, error);
    return null; // MGET 자체 오류 시 null 반환
  }
};

module.exports = {
  redisJsonGet,
  redisJsonSet,
  redisJsonMGet,
};
