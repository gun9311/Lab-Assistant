const express = require('express');
const auth = require('../middleware/auth');
const amqp = require('amqplib/callback_api');
const { submitQuiz, addQuiz, getQuiz } = require('../controllers/quizController');
require('dotenv').config();  // dotenv 패키지를 사용하여 환경 변수를 로드합니다.

const router = express.Router();

let channel;
amqp.connect(process.env.RABBITMQ_URL, (err, connection) => {
  if (err) {
    console.error('Failed to connect to RabbitMQ:', err);
    return;
  }
  connection.createChannel((err, ch) => {
    if (err) {
      console.error('Failed to create a channel:', err);
      return;
    }
    channel = ch;
    channel.assertQueue('quiz_queue', { durable: true });
  });
});

// 클로저 사용: 미들웨어에서 채널을 req에 추가
const submitQuizWithChannel = (req, res, next) => {
  if (!channel) {
    return res.status(500).send('RabbitMQ channel is not available');
  }
  req.channel = channel; // req 객체에 채널 추가
  next(); // 다음 미들웨어로 이동
};

// 라우터 설정
router.post('/submit', auth('student'), submitQuizWithChannel, submitQuiz);
router.get('/', auth('student'), getQuiz); // 퀴즈 문제를 가져오는
router.post('/', auth('admin'), addQuiz);

module.exports = router;
