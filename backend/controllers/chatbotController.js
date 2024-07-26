const { v4: uuidv4 } = require('uuid'); // UUID 생성 라이브러리
const { getNLPResponse } = require('../services/nlpService');
const ChatSummary = require('../models/ChatSummary');
const redisClient = require('../utils/redisClient'); // Redis 클라이언트 가져오기

let clients = {}; // 실제 웹소켓 객체를 메모리에 저장

const handleWebSocketConnection = async (ws, userId) => {
  const clientsKey = `clients:${userId}`;
  const chatHistoryKey = `chatHistories:${userId}`;
  const clientId = uuidv4(); // 고유한 클라이언트 ID 생성

  let clientList = await redisClient.get(clientsKey);
  if (!clientList) {
    clientList = [];
  } else {
    clientList = JSON.parse(clientList);
  }

  let chatHistory = await redisClient.get(chatHistoryKey);
  if (!chatHistory) {
    chatHistory = [];
  } else {
    chatHistory = JSON.parse(chatHistory);
  }

  // 클라이언트 목록에 새로운 클라이언트 추가
  clientList.push(clientId);
  await redisClient.set(clientsKey, JSON.stringify(clientList));
  clients[clientId] = ws; // 실제 웹소켓 객체를 메모리에 저장

  ws.on('message', async (message) => {
    const { grade, semester, subject, unit, topic, userMessage } = JSON.parse(message);
    const botResponse = await getNLPResponse([
      { role: 'system', content: `You are a tutor helping a student with ${subject}. The student is in ${grade} grade, ${semester} semester, studying the ${unit} unit on ${topic}.` },
      ...chatHistory.map(chat => [{ role: 'user', content: chat.user }, { role: 'assistant', content: chat.bot }]).flat(),
      { role: 'user', content: userMessage }
    ]);

    chatHistory.push({ user: userMessage, bot: botResponse });
    await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));

    clientList.forEach(clientId => {
      if (clients[clientId]) {
        clients[clientId].send(JSON.stringify({ user: userMessage, bot: botResponse }));
      }
    });
  });

  ws.on('close', async () => {
    let clientList = await redisClient.get(clientsKey);
    if (clientList) {
      clientList = JSON.parse(clientList).filter(id => id !== clientId);
      await redisClient.set(clientsKey, JSON.stringify(clientList));
    }
    delete clients[clientId]; // 메모리에서 웹소켓 객체 제거
  });
};

const saveChatSummary = async (req, res) => {
  const userId = req.user._id;
  const { subject } = req.body;

  const clientsKey = `clients:${userId}`;
  const chatHistoryKey = `chatHistories:${userId}`;

  try {
    let chatHistory = await redisClient.get(chatHistoryKey);
    if (!chatHistory) {
      return res.status(400).send({ error: 'No chat history found for this user' });
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
    await redisClient.del(clientsKey);

    res.status(200).send({ message: 'Chat summary saved successfully' });
  } catch (error) {
    console.error('Failed to save chat summary:', error);
    res.status(500).send({ error: 'Failed to save chat summary' });
  }
};

module.exports = { handleWebSocketConnection, saveChatSummary };
