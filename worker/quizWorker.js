const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');
const { evaluateQuiz } = require('./quizEvaluator');
require('dotenv').config();  // dotenv 패키지를 사용하여 환경 변수를 로드합니다.

mongoose.connect(process.env.MONGODB_URL, {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

amqp.connect(process.env.RABBITMQ_URL, (err, connection) => {
  if (err) {
    throw err;
  }
  connection.createChannel((err, channel) => {
    if (err) {
      throw err;
    }
    channel.assertQueue('quiz_queue', { durable: true });
    channel.prefetch(1);

    channel.consume('quiz_queue', async (msg) => {
      const quizData = JSON.parse(msg.content.toString());
      // console.log('Received quiz data:', quizData); // 로그 추가
      try {
        const result = await evaluateQuiz(quizData);
        console.log('Evaluation result:', result); // 로그 추가
        channel.ack(msg);
      } catch (error) {
        console.error('Failed to evaluate quiz:', error);
        channel.nack(msg, false, false); // 메시지 다시 처리하지 않음
      }
    }, { noAck: false });
  });
});
