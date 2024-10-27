const { handleWebSocketConnection, handleDisconnection, saveChatSummaryInternal } = require('../../controllers/chatbotController');
const redisClient = require('../../utils/redisClient');
const ChatSummary = require('../../models/ChatSummary');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Redis 클라이언트를 모킹하여 실제 연결 방지
jest.mock('../../utils/redisClient', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn().mockResolvedValue(),  // 실제 연결을 모킹
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(),  // 연결 종료도 모킹
}));

// ChatSummary 모델도 모킹
jest.mock('../../models/ChatSummary');

describe('Chatbot Controller', () => {
    let ws;

    beforeEach(() => {
        ws = {
            send: jest.fn(),
            on: jest.fn(),
            terminate: jest.fn(),
            readyState: WebSocket.OPEN,
            ping: jest.fn(),
        };

        redisClient.get.mockClear();
        redisClient.set.mockClear();
        redisClient.del.mockClear();
        ChatSummary.findOne.mockClear();
        ChatSummary.prototype.save.mockClear();
    });

    it('should handle WebSocket connection and save chat history', async () => {
        const userId = 'testUserId';
        const subject = 'Math';
        redisClient.get.mockResolvedValue(JSON.stringify([{ user: 'Hello', bot: 'Hi' }]));

        await handleWebSocketConnection(ws, userId, subject);

        expect(redisClient.get).toHaveBeenCalledWith(`chatHistories:${userId}`);
        expect(ws.on).toHaveBeenCalledWith('message', expect.any(Function));
        expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should handle WebSocket disconnection and save chat summary', async () => {
        const userId = 'testUserId';
        const subject = 'Math';
        const clientId = uuidv4();

        redisClient.get.mockResolvedValue(JSON.stringify([{ user: 'Hello', bot: 'Hi' }]));

        await handleDisconnection(userId, subject, clientId, ws);

        expect(ChatSummary.findOne).toHaveBeenCalledWith({ student: userId, 'subjects.subject': subject });
        expect(redisClient.del).toHaveBeenCalledWith(`chatHistories:${userId}`);
    });

    it('should save chat summary internally', async () => {
        const userId = 'testUserId';
        const subject = 'Math';
        redisClient.get.mockResolvedValue(JSON.stringify([{ user: 'Hello', bot: 'Hi' }]));

        await saveChatSummaryInternal(userId, subject);

        expect(ChatSummary.findOne).toHaveBeenCalledWith({ student: userId, 'subjects.subject': subject });
        expect(redisClient.del).toHaveBeenCalledWith(`chatHistories:${userId}`);
    });
});
