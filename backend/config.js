module.exports = {
  chatLimits: {
    DAILY_LIMIT: 15,
    MONTHLY_LIMIT: 150,
    RECENT_HISTORY_COUNT: 3,
  },
  serverConfig: {
    ALLOWED_ORIGINS: ["http://localhost:3000", "https://nudgeflow.co.kr"],
    DEFAULT_PORT: 5000,
  },
  studentServiceHours: {
    START_HOUR: 0, // 오전 8시
    END_HOUR: 24, // 오후 11시 (23시 전까지 허용)
    SERVER_TIMEZONE: "Asia/Seoul",
  },
  anthropicAI: {
    MODEL: "claude-3-haiku-20240307",
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
  },
  loggerConfig: {
    LEVEL: "warn",
    TIMESTAMP_FORMAT: "YYYY-MM-DD HH:mm:ss",
    DEFAULT_META_SERVICE: "backend-server",
  },
  apiRateLimits: {
    MAX_INPUT_TOKENS_PER_MINUTE: 48500,
    MAX_OUTPUT_TOKENS_PER_MINUTE: 9700,
    ESTIMATED_INPUT_TOKENS: 2200, // 예상 입력 토큰
    ESTIMATED_OUTPUT_TOKENS: 500, // 예상 출력 토큰
  },
};
