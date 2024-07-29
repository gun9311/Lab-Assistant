const { v4: uuidv4 } = require('uuid');
const { getNLPResponse } = require('../services/nlpService');
const ChatSummary = require('../models/ChatSummary');
const redisClient = require('../utils/redisClient'); // Redis 클라이언트 가져오기

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
  console.log('클라이언트 연결 저장 clients : ' + clients);

  // 핑/퐁 메커니즘 설정
  let isAlive = true;

  ws.on('pong', () => {
    isAlive = true;
  });

  const pingInterval = setInterval(async () => {
    if (ws.readyState === ws.OPEN) {
      if (!isAlive) {
        console.log('----------!isAlive--------------');
        await handleDisconnection(userId, subject, clientId, ws);
      } else {
        isAlive = false;
        ws.ping();
        console.log('----------ws.ping 호출됨--------------');
      }
    }
  }, 60000); // 60초마다 핑 메시지 전송

  ws.on('message', async (message) => {
    const { grade, semester, subject, unit, topic, userMessage } = JSON.parse(message);
    const botResponse = await getNLPResponse([
      { role: 'system', content: `You are a tutor helping a student with ${subject}. The student is in ${grade} grade, ${semester} semester, studying the ${unit} unit on ${topic}.` },
      ...chatHistory.map(chat => [{ role: 'user', content: chat.user }, { role: 'assistant', content: chat.bot }]).flat(),
      { role: 'user', content: userMessage }
    ]);

    chatHistory.push({ user: userMessage, bot: botResponse });
    await redisClient.set(chatHistoryKey, JSON.stringify(chatHistory));

    ws.send(JSON.stringify({ user: userMessage, bot: botResponse }));
  });

  ws.on('close', async () => {
    console.log('----------ws.close 호출됨--------------');
    clearInterval(pingInterval); // 핑/퐁 메커니즘 중지
    await handleDisconnection(userId, subject, clientId, ws);
  });
};

const handleDisconnection = async (userId, subject, clientId, ws) => {
  await saveChatSummaryInternal(userId, subject); // 실제 subject 정보를 전달
  // console.log('----------saveChatSummaryInternal 호출됨--------------');

  delete clients[clientId]; // 메모리에서 웹소켓 객체 제거
  console.log('객체 제거 clients : ' + clients);

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

module.exports = { handleWebSocketConnection };
