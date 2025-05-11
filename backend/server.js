require("dotenv").config();
const logger = require("./utils/logger");
require("./services/fcmService");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
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
const ChatSummary = require("./models/ChatSummary");
const cron = require("node-cron");
const redisClient = require("./utils/redisClient");
const cors = require("cors");
const timeRoutes = require("./routes/timeRoutes"); // 새로 추가
const config = require("./config"); // 설정 파일 로드
const { handleNewWebSocketConnection } = require("./websocketInitialSetup"); // 수정

// MongoDB 연결
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("MongoDB connected"))
  .catch((err) => logger.error("MongoDB connection error:", err));

// Express 앱 설정
const app = express();

const { ALLOWED_ORIGINS } = config.serverConfig; // 설정값 사용

app.use(
  cors({
    origin: (origin, callback) => {
      if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // 자격 증명을 포함한 요청 허용
  })
);

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(compression());
app.use(bodyParser.json());

// 헬스체크 엔드포인트 추가 (라우트 설정 전에 추가)
app.get("/health", async (req, res) => {
  try {
    // MongoDB 연결 확인
    if (mongoose.connection.readyState !== 1) {
      throw new Error("MongoDB not connected");
    }
    await mongoose.connection.db.admin().ping();

    // 모든 서비스 정상
    res.status(200).json({
      status: "healthy",
      mongodb: "connected",
      redis: "connected",
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
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
app.use("/api/kahoot-quiz", kahootQuizRoutes); // 카훗 스타일 퀴즈 서비스 라우트 추가
app.use("/api/time", timeRoutes); // 새로 추가

// HTTP 서버 시작
const serverPort = process.env.PORT || config.serverConfig.DEFAULT_PORT; // 수정됨
const server = app.listen(serverPort, () => {
  // 수정됨
  logger.info(`Server running on port ${serverPort}`); // 수정됨
});

// 웹소켓 서버 생성
const wss = new WebSocketServer({ server });

// 웹소켓 서버 연결 처리 (수정)
wss.on("connection", handleNewWebSocketConnection);

// 크론 작업 설정 (채팅 요약 데이터 삭제)
// cron.schedule("0 0 * * *", async () => {
//   logger.info("Running removeOldSummaries at midnight");
//   try {
//     const days = 7;
//     // 기존: const chatSummaries = await ChatSummary.find();
//     // 변경: ChatSummary.find().cursor() 사용하여 메모리 효율성 증대
//     const cursor = ChatSummary.find().cursor();

//     // 기존: for (const chatSummary of chatSummaries) {
//     // 변경: for await...of 구문으로 커서 처리
//     for await (const chatSummary of cursor) {
//       await chatSummary.removeOldSummaries(days);
//     }
//     logger.info("Old summaries removed successfully");
//   } catch (error) {
//     logger.error("Error removing old summaries:", error);
//   }
// });
