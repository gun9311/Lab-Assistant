const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch((err) => console.error('Failed to connect to Redis:', err));

module.exports = redisClient;