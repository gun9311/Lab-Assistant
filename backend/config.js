module.exports = {
  chatLimits: {
    DAILY_LIMIT: 15,
    MONTHLY_LIMIT: 150,
    RECENT_HISTORY_COUNT: 4,
  },
  serverConfig: {
    ALLOWED_ORIGINS: ["http://localhost:3000", "https://nudgeflow.co.kr"],
    DEFAULT_PORT: 5000,
  },
  studentServiceHours: {
    START_HOUR: 9, // 오전 8시
    END_HOUR: 15, // 오후 11시 (23시 전까지 허용)
    SERVER_TIMEZONE: "Asia/Seoul",
  },
  openAI: {
    // OpenAI 관련 설정 추가
    MODEL: "gpt-4.1-nano",
    MAX_TOKENS: 1000,
    TEMPERATURE: 0.7,
  },
  loggerConfig: {
    // 로거 관련 설정 추가
    LEVEL: "warn",
    TIMESTAMP_FORMAT: "YYYY-MM-DD HH:mm:ss",
    DEFAULT_META_SERVICE: "backend-server",
  },
  // 필요에 따라 다른 설정값들 추가 가능
};
