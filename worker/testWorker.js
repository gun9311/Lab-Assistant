const amqp = require('amqplib/callback_api');

const quizData = {
  studentId: '669e26bca7f663e76b7986b0', // 학생 ID
  subject: '과학', // 과목
  semester: '2학기', // 학기
  unit: '1전기', // 단원
  answers: [
    { questionId: '60c72b2f9b1d8b3a2c8e4e3b', studentAnswer: '답변1' },
    { questionId: '60c72b2f9b1d8b3a2c8e4e3c', studentAnswer: '답변2' }
  ]
};

amqp.connect('amqp://guest:guest@localhost:5672', (err, connection) => {
  if (err) {
    throw err;
  }
  connection.createChannel((err, channel) => {
    if (err) {
      throw err;
    }
    channel.assertQueue('quiz_queue', { durable: true });
    channel.sendToQueue('quiz_queue', Buffer.from(JSON.stringify(quizData)));
    console.log('Sent quiz data to queue');
    setTimeout(() => {
      connection.close();
    }, 500);
  });
});


  
