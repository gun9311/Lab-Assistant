//server.js
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
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const reportRoutes = require('./routes/reportRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes'); 
const { handleWebSocketConnection } = require('./controllers/chatbotController');
const ChatSummary = require('./models/ChatSummary');
const cron = require('node-cron');
const redisClient = require('./utils/redisClient'); // Redis 클라이언트 가져오기
const cors = require('cors')
const winston = require('winston'); // winston 로깅 라이브러리 추가

require('dotenv').config();
require('./services/fcmService');

// 로거 설정
const logger = winston.createLogger({
  level: 'info',  // 로그 레벨 설정: info 레벨 이상의 로그만 기록
  format: winston.format.json(),  // 로그 형식을 JSON으로 설정
  transports: [
    new winston.transports.Console(),  // 콘솔에 로그 출력
    new winston.transports.File({ filename: '/app/logs/server.log' }) // 로그 파일 설정
  ]
});

mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const app = express();

app.use(cors());

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
// 
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/quiz-results', quizResultsRoutes);
app.use('/api/report', reportRoutes); 
app.use('/api/notifications', notificationRoutes); // 새로운 라우트 추가

const server = app.listen(process.env.PORT || 5000, () => {
  logger.info(`Server running on port ${process.env.PORT || 5000}`); // 서버 시작 로그
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const token = urlParams.get('token');
  const subject = urlParams.get('subject');
  if (!token || !subject) {
    ws.close();
    logger.warn('WebSocket connection closed due to missing token or subject');
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      ws.close();
      logger.error('WebSocket connection closed due to JWT verification error:', err);
      return;
    }

    ws.user = user;
    logger.info(`WebSocket connection established for user: ${user._id}`);
    handleWebSocketConnection(ws, user._id, subject);
  });
});

// 매일 자정에 removeOldSummaries 실행
cron.schedule('0 0 * * *', async () => {
  logger.info('Running removeOldSummaries at midnight');
  try {
    const days = 3; // 삭제할 요약의 기준 기간 (3일 이전)
    const chatSummaries = await ChatSummary.find();
    for (const chatSummary of chatSummaries) {
      await chatSummary.removeOldSummaries(days);
    }
    logger.info('Old summaries removed successfully');
  } catch (error) {
    logger.error('Error removing old summaries:', error);
  }
});
