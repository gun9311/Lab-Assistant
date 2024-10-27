const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const quizResultsRoutes = require('./routes/quizResultsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const kahootQuizRoutes = require('./routes/kahootQuizRoutes');  // 새로 추가한 라우트
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes'); 
const { handleWebSocketConnection } = require('./controllers/chatbotController');
const { handleTeacherWebSocketConnection, handleStudentWebSocketConnection } = require('./controllers/kahootQuizController'); // Kahoot 웹소켓 핸들러 추가
const ChatSummary = require('./models/ChatSummary');
const cron = require('node-cron');
const redisClient = require('./utils/redisClient');
const cors = require('cors');
const winston = require('winston');
const KahootQuizSession = require('./models/KahootQuizSession');

require('dotenv').config();
require('./services/fcmService');

// Winston 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/app/logs/server.log' })
  ]
});

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URL)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('MongoDB connection error:', err));

// Express 앱 설정
const app = express();

app.use(cors());

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quiz-results', quizResultsRoutes);
app.use('/api/report', reportRoutes); 
app.use('/api/notifications', notificationRoutes);
app.use('/api/kahoot-quiz', kahootQuizRoutes);  // 카훗 스타일 퀴즈 서비스 라우트 추가

// HTTP 서버 시작
const server = app.listen(process.env.PORT || 5000, () => {
  logger.info(`Server running on port ${process.env.PORT || 5000}`);
});

// 웹소켓 서버 생성
const wss = new WebSocketServer({ server });

// 웹소켓 서버 생성
wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const token = urlParams.get('token');
  const pin = urlParams.get('pin');
  const subject = urlParams.get('subject');

  // JWT 토큰이 없는 경우 연결 종료 및 오류 메시지 전송
  if (!token) {
    const errorMessage = JSON.stringify({ error: 'Missing token' });
    ws.send(errorMessage);
    ws.close();
    logger.warn('WebSocket connection closed due to missing token');
    return;
  }

  // JWT 검증
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      const errorMessage = JSON.stringify({ error: 'Invalid or expired token' });
      ws.send(errorMessage); // 클라이언트에게 오류 메시지 전송
      ws.close();
      logger.error('WebSocket connection closed due to JWT verification error:', err);
      return;
    }

    ws.user = user;
    logger.info(`WebSocket connection established for user: ${user._id}`);

    // 세션 PIN으로 레디스에서 세션 조회
    if (subject) {
      logger.info('채팅 웹소켓 분기');
      handleWebSocketConnection(ws, user._id, subject);

    
    } else if (pin) {
      let session = await redisClient.get(`session:${pin}`);
      // logger.info('퀴즈 웹소켓 분기');
      // 세션이 레디스에 없으면 에러 반환
      if (!session) {
        ws.send(JSON.stringify({ error: 'Session not found' }));
        logger.warn(`Session not found for pin: ${pin}`);
        ws.close();
        return;
      }

      if (session) {
        // 세션 참여 처리
        logger.info(`User ${user._id} attempting to join session ${pin}`); // session._id로 수정
        if (user.role === 'teacher') {
          logger.info('교사 퀴즈 웹소켓 분기');
          handleTeacherWebSocketConnection(ws, user._id, pin); // session._id로 수정
        } else if (user.role === 'student') {
          logger.info('학생 퀴즈 웹소켓 분기');
          handleStudentWebSocketConnection(ws, user._id, pin); // session._id로 수정
        } else {
          const errorMessage = JSON.stringify({ error: 'Invalid user role' });
          ws.send(errorMessage); // 역할이 잘못된 경우도 클라이언트에 오류 메시지 전송
          ws.close();
          logger.warn('Invalid user role, connection closed');
        }    
    } else {
      const errorMessage = JSON.stringify({ error: 'Missing sessionId or subject' });
      ws.send(errorMessage); // 세션 ID 또는 주제가 없는 경우
      ws.close();
      logger.warn('WebSocket connection closed due to missing sessionId or subject');
      }
    }
  });
});

// 크론 작업 설정 (채팅 요약 데이터 삭제)
cron.schedule('0 0 * * *', async () => {
  logger.info('Running removeOldSummaries at midnight');
  try {
    const days = 3;
    const chatSummaries = await ChatSummary.find();
    for (const chatSummary of chatSummaries) {
      await chatSummary.removeOldSummaries(days);
    }
    logger.info('Old summaries removed successfully');
  } catch (error) {
    logger.error('Error removing old summaries:', error);
  }
});
