//chatbotController.js
const { v4: uuidv4 } = require('uuid');
const { getNLPResponse } = require('../services/nlpService');
const ChatSummary = require('../models/ChatSummary');
const redisClient = require('../utils/redisClient'); // Redis 클라이언트 가져오기
const winston = require('winston'); // winston 로깅 라이브러리 추가

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/app/logs/websocket.log' }) // 로그 파일 설정
  ]
});

let clients = {}; // 실제 웹소켓 객체를 메모리에 저장

const handleWebSocketConnection = async (ws, userId, subject) => {
  const chatHistoryKey = `chatHistories:${userId}`;
  const clientId = uuidv4(); // 고유한 클라이언트 ID 생성

  let chatHistory = await redisClient.get(chatHistoryKey);
  if (!chatHistory) {
    chatHistory = [];
  } else {
    chatHistory = JSON.parse(chatHistory);
  }

  // 클라이언트 연결 저장
  clients[clientId] = ws; // 각 클라이언트의 ws 객체를 고유하게 저장
  logger.info(`Client connected: ${clientId} for user ${userId}, subject: ${subject}`);

  // 핑/퐁 메커니즘 설정
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;
  });

  const pingInterval = setInterval(async () => {
    if (ws.readyState === ws.OPEN) {
      if (!isAlive) {
        logger.warn(`Client ${clientId} did not respond to ping, terminating connection`);
        await handleDisconnection(userId, subject, clientId, ws);
      } else {
        isAlive = false;
        ws.ping();
        logger.info(`Ping sent to client ${clientId}`);
      }
    }
  }, 60000); // 60초마다 핑 메시지 전송

  ws.on('message', async (message) => {
    const { grade, semester, subject, unit, topic, userMessage } = JSON.parse(message);

    // 최근 대화 몇 개만 포함 (예: 마지막 3개의 대화)
    const recentHistory = chatHistory.slice(-3);

    const botResponse = await getNLPResponse([
        { role: 'system', content: `당신은 친절하고 인내심 있는 튜터입니다. 지금 ${grade}학년 학생이 ${subject} 과목을 이해하도록 돕고 있습니다. 학생은 현재 ${unit} 단원에서 ${topic}을(를) 공부하고 있습니다. 개념을 쉽게, 명확하게, 그리고 격려하는 방식으로 설명해 주세요.` },
        ...recentHistory.map(chat => [{ role: 'user', content: chat.user }, { role: 'assistant', content: chat.bot }]).flat(),
        { role: 'user', content: userMessage }
    ]);

    chatHistory.push({ user: userMessage, bot: botResponse });
    await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));

    ws.send(JSON.stringify({ bot: botResponse }));
});

  ws.on('close', async () => {
    logger.info(`Client ${clientId} disconnected`);
    clearInterval(pingInterval); // 핑/퐁 메커니즘 중지
    await handleDisconnection(userId, subject, clientId, ws);
  });
};

const handleDisconnection = async (userId, subject, clientId, ws) => {
  await saveChatSummaryInternal(userId, subject); // 실제 subject 정보를 전달
  // console.log('----------saveChatSummaryInternal 호출됨--------------');

  delete clients[clientId]; // 메모리에서 웹소켓 객체 제거
  logger.info(`Client ${clientId} removed from memory`);

  if (ws.readyState === ws.OPEN || ws.readyState === ws.CLOSING) {
    ws.terminate(); // 연결 종료
  }
};

const saveChatSummaryInternal = async (userId, subject) => {
  const chatHistoryKey = `chatHistories:${userId}`;

  try {
    let chatHistory = await redisClient.get(chatHistoryKey);
    if (!chatHistory) {
      console.error('No chat history found for this user');
      return;
    }

    chatHistory = JSON.parse(chatHistory);
    const summary = chatHistory.map(msg => `You: ${msg.user}\nBot: ${msg.bot}`).join('\n');

    let chatSummary = await ChatSummary.findOne({ student: userId, 'subjects.subject': subject });

    if (chatSummary) {
      // 기존 subject에 summary 추가
      chatSummary.subjects.forEach(sub => {
        if (sub.subject === subject) {
          sub.summaries.push({ summary, createdAt: new Date() });
        }
      });
    } else {
      // 새로운 subject 추가
      chatSummary = new ChatSummary({
        student: userId,
        subjects: [{ subject, summaries: [{ summary, createdAt: new Date() }] }]
      });
    }

    await chatSummary.save();

    // 대화 내역 삭제
    await redisClient.del(chatHistoryKey);

    console.log('Chat summary saved successfully');
  } catch (error) {
    console.error('Failed to save chat summary:', error);
  }
};

module.exports = { handleWebSocketConnection, handleDisconnection, saveChatSummaryInternal };