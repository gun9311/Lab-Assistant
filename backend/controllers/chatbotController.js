const { v4: uuidv4 } = require('uuid');
const { getNLPResponse } = require('../services/nlpService');
const ChatSummary = require('../models/ChatSummary');
const redisClient = require('../utils/redisClient');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/app/logs/websocket.log' })
  ]
});

let clients = {};

const handleWebSocketConnection = async (ws, userId, subject) => {
  const chatHistoryKey = `chatHistories:${userId}`;
  const clientId = uuidv4();

  let chatHistory = await redisClient.get(chatHistoryKey);
  if (!chatHistory) {
    chatHistory = [];
  } else {
    chatHistory = JSON.parse(chatHistory);
  }

  clients[clientId] = ws;
  logger.info(`Client connected: ${clientId} for user ${userId}, subject: ${subject}. Total active connections: ${Object.keys(clients).length}`);

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
  }, 60000);

  ws.on('message', async (message) => {
    const startTime = process.hrtime();

    try {
      const { grade, semester, subject, unit, topic, userMessage } = JSON.parse(message);
      const recentHistory = chatHistory.slice(-3);

      const messages = [
        { role: 'system', content: `당신은 친절하고 인내심 있는 튜터입니다. 지금 ${grade}학년 학생이 ${subject} 과목을 이해하도록 돕고 있습니다. 학생은 현재 ${unit} 단원에서 ${topic}을(를) 공부하고 있습니다. 개념을 쉽게, 명확하게, 그리고 격려하는 방식으로 설명해 주세요.` },
        ...recentHistory.map(chat => [{ role: 'user', content: chat.user }, { role: 'assistant', content: chat.bot }]).flat(),
        { role: 'user', content: userMessage }
      ];

      if (!messages.every(m => m.content)) {
        console.error('Invalid messages format:', messages);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
        return;
      }

      // NLP 서비스로 메시지를 보내서 응답 스트리밍 처리
      const streamResponse = getNLPResponse(messages);

      let botResponseContent = '';  // 스트리밍 응답을 저장할 변수

      for await (const botResponse of streamResponse) {
        ws.send(JSON.stringify({ bot: botResponse, isFinal: false }));
        botResponseContent += botResponse;  // 전체 응답 저장
      }

      ws.send(JSON.stringify({ bot: null, isFinal: true }));  // 마지막 응답

      // Redis에 유저 메시지와 봇의 응답 저장
      chatHistory.push({ user: userMessage, bot: botResponseContent });
      await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));  // Redis에 대화 기록 저장

    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ error: 'Failed to process message' }));
    }

    const endTime = process.hrtime(startTime);
    const elapsedTime = endTime[0] * 1000 + endTime[1] / 1e6;
    logger.info(`Message processed for client ${clientId}: ${elapsedTime.toFixed(2)}ms`);
  });

  ws.on('close', async () => {
    logger.info(`Client ${clientId} disconnected. Total active connections: ${Object.keys(clients).length - 1}`);
    clearInterval(pingInterval);  // pingInterval 정리
    await handleDisconnection(userId, subject, clientId, ws);
  });

  ws.on('error', async (error) => {
    logger.error(`Error occurred on client ${clientId}: ${error}`);
    clearInterval(pingInterval);  // pingInterval 정리
    await handleDisconnection(userId, subject, clientId, ws);  // 비정상 종료 처리
  });
};

const handleDisconnection = async (userId, subject, clientId, ws) => {
  await saveChatSummaryInternal(userId, subject);

  delete clients[clientId];
  logger.info(`Client ${clientId} removed from memory. Total active connections: ${Object.keys(clients).length}`);

  if (ws.readyState === ws.OPEN || ws.readyState === ws.CLOSING) {
    ws.terminate();  // WebSocket 연결 상태가 열려있거나 닫히는 중일 때만 terminate 호출
    logger.info(`WebSocket connection for client ${clientId} terminated.`);
  }
};

const saveChatSummaryInternal = async (userId, subject) => {
  const chatHistoryKey = `chatHistories:${userId}`;

  try {
    let chatHistory = await redisClient.get(chatHistoryKey);
    if (!chatHistory) {
      logger.warn('No chat history found for this user');
      return;
    }

    chatHistory = JSON.parse(chatHistory);
    const summary = chatHistory.map(msg => `You: ${msg.user}\nBot: ${msg.bot}`).join('\n');

    let chatSummary = await ChatSummary.findOne({ student: userId, 'subjects.subject': subject });

    if (chatSummary) {
      // 성능 개선: subjects 배열에서 해당 과목을 찾을 때 find 사용
      let subjectData = chatSummary.subjects.find(sub => sub.subject === subject);

      if (subjectData) {
        subjectData.summaries.push({ summary, createdAt: new Date() });
      } else {
        chatSummary.subjects.push({ subject, summaries: [{ summary, createdAt: new Date() }] });
      }
    } else {
      chatSummary = new ChatSummary({
        student: userId,
        subjects: [{ subject, summaries: [{ summary, createdAt: new Date() }] }]
      });
    }

    await chatSummary.save();
    await redisClient.del(chatHistoryKey);  // Redis에서 기록 삭제

    logger.info('Chat summary saved successfully');
  } catch (error) {
    logger.error('Failed to save chat summary:', error);
  }
};

module.exports = { handleWebSocketConnection, handleDisconnection, saveChatSummaryInternal };
