const winston = require("winston");
const config = require("../config"); // 설정 파일 로드

const logger = winston.createLogger({
  level: config.loggerConfig.LEVEL, // 수정됨, 환경 변수로 로그 레벨 설정 가능하도록 변경
  format: winston.format.combine(
    winston.format.timestamp({ format: config.loggerConfig.TIMESTAMP_FORMAT }), // 수정됨, 타임스탬프 형식 지정
    winston.format.errors({ stack: true }), // 에러 스택 트레이스 포함
    winston.format.splat(),
    winston.format.json() // JSON 형식으로 로그 출력
  ),
  defaultMeta: { service: config.loggerConfig.DEFAULT_META_SERVICE }, // 수정됨, 모든 로그에 서비스 이름 메타데이터 추가 (선택적)
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // 콘솔 출력 시 색상 적용
        winston.format.simple() // 간단한 형식으로 콘솔에 표시
      ),
    }),
    // 필요하다면 파일 로깅 등 다른 Transport 추가
    // new winston.transports.File({ filename: '/app/logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: '/app/logs/combined.log' })
  ],
  exceptionHandlers: [
    // 처리되지 않은 예외 로깅
    new winston.transports.Console(),
    // new winston.transports.File({ filename: '/app/logs/exceptions.log' })
  ],
  rejectionHandlers: [
    // 처리되지 않은 Promise 거부 로깅
    new winston.transports.Console(),
    // new winston.transports.File({ filename: '/app/logs/rejections.log' })
  ],
});

// 프로덕션 환경이 아닐 때만 콘솔에 모든 레벨 로그 출력 (선택적)
// if (process.env.NODE_ENV !== 'production') {
//   logger.add(new winston.transports.Console({
//     format: winston.format.simple(),
//   }));
// }

module.exports = logger;
