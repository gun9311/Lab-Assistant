require('dotenv').config();
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { fromEnv } = require('@aws-sdk/credential-providers');
const mongoose = require('mongoose');
const { evaluateQuiz } = require('./quizEvaluator');

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(), // 환경 변수에서 자격 증명 가져오기
});

const queueUrl = process.env.QUIZ_QUEUE_URL;

const processMessage = async (message) => {
  const quizData = JSON.parse(message.Body);
  console.log('Received quiz data:', quizData); // 로그 추가
  try {
    const result = await evaluateQuiz(quizData);
    console.log('Evaluation result:', result); // 로그 추가

    // 메시지 삭제
    const deleteParams = {
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    };
    const deleteCommand = new DeleteMessageCommand(deleteParams);
    await sqsClient.send(deleteCommand);
    console.log('Message deleted:', message.ReceiptHandle); // 메시지 삭제 확인 로그
  } catch (error) {
    console.error('Failed to evaluate quiz:', error);
  }
};

const pollMessages = async () => {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 300, // 메시지 가시성 타임아웃 설정
  };

  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params));
    if (data.Messages) {
      for (const message of data.Messages) {
        await processMessage(message);
      }
    }
  } catch (error) {
    console.error('Error receiving messages from SQS:', error);
  }
};

// 지속적으로 메시지를 폴링하여 처리
setInterval(pollMessages, 10000); // 10초 간격으로 폴링
