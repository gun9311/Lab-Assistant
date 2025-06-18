require("dotenv").config();
const logger = require("./utils/logger");
require("./services/fcmService");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { WebSocketServer } = require("ws");
// const jwt = require("jsonwebtoken"); // jwt는 websocketInitialSetup.js에서 사용
const compression = require("compression");
const authRoutes = require("./routes/authRoutes");
// const quizRoutes = require('./routes/quizRoutes');
const quizResultsRoutes = require("./routes/quizResultsRoutes");
const chatRoutes = require("./routes/chatRoutes");
const kahootQuizRoutes = require("./routes/kahootQuizRoutes"); // 새로 추가한 라우트
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
// const ChatSummary = require("./models/ChatSummary"); // 현재 사용되지 않음
// const cron = require("node-cron"); // 현재 사용되지 않음
const { redisClient } = require("./utils/redisClient"); // redisClient만 가져오도록 수정 (subscriberClient는 kahootShared에서 사용)
const cors = require("cors");
const timeRoutes = require("./routes/timeRoutes"); // 새로 추가
const config = require("./config"); // 설정 파일 로드
const { handleNewWebSocketConnection } = require("./websocketInitialSetup");
const { initializeKahootPubSub } = require("./handlers/kahootShared"); // Pub/Sub 초기화 함수 import

// MongoDB 연결
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => logger.error("MongoDB connection error:", err));

// Express 앱 설정
const app = express();

const { ALLOWED_ORIGINS } = config.serverConfig;

app.use(
  cors({
    origin: (origin, callback) => {
      if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  session({
    store: new RedisStore({ client: redisClient }), // 여기서는 기본 redisClient 사용
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(compression());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.get("/health", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected");
    }
    await mongoose.connection.db.admin().ping();

    // Redis 연결 확인 (ping 사용)
    const redisPingResponse = await redisClient.ping();
    if (redisPingResponse !== "PONG") {
      throw new Error("Redis not connected or not responding PONG");
    }

    res.status(200).json({
      status: "healthy",
      mongodb: "connected",
      redis: "connected", // Redis 상태 추가
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      mongodb:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      redis: "check_failed", // Redis 상세 상태는 에러 메시지에 포함될 것임
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/quiz-results", quizResultsRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/kahoot-quiz", kahootQuizRoutes);
app.use("/api/time", timeRoutes);

const serverPort = process.env.PORT || config.serverConfig.DEFAULT_PORT;

// 애플리케이션 시작을 위한 async 함수
async function startServer() {
  try {
    // HTTP 서버 시작
    const server = app.listen(serverPort, () => {
      logger.info(`Server running on port ${serverPort}`);
    });

    // 웹소켓 서버 생성
    const wss = new WebSocketServer({ server });
    wss.on("connection", handleNewWebSocketConnection);

    // Kahoot Pub/Sub 리스너 초기화
    await initializeKahootPubSub(); // Pub/Sub 초기화 호출
    logger.info("Kahoot Pub/Sub listener initialized successfully.");
  } catch (error) {
    logger.error("Failed to start the server or initialize Pub/Sub:", error);
    process.exit(1); // 시작 실패 시 프로세스 종료
  }
}

// 서버 시작 함수 호출
startServer();

// 크론 작업 설정은 현재 주석 처리되어 있으므로 그대로 둡니다.
// ...
