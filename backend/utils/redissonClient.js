// utils/redissonClient.js
let redissonClient;

const initializeRedissonClient = async () => {
  try {
    const { Redisson } = await import('redisson');
    redissonClient = await Redisson.create({
      // Redis 설정
      url: process.env.REDIS_URL,
    });
    console.log('Connected to Redis with Redisson');
  } catch (error) {
    console.error('Redisson initialization failed:', error);
    throw error;
  }
};

module.exports = { initializeRedissonClient, redissonClient };