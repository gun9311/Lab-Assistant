const amqp = require('amqplib/callback_api');
// const StudentReport = require('../models/StudentReport');
// const QuizResult = require('../models/QuizResult');
// const Subject = require('../models/Subject');

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
    channel.assertQueue('report_queue', { durable: true });
  });
});

// 보고서 생성 요청 핸들러
const generateReport = async (req, res) => {
  const { selectedSemesters, selectedSubjects, selectedStudents, reportLines } = req.body;

  if (!channel) {
    return res.status(500).send('RabbitMQ channel is not available');
  }

  const reportData = { selectedSemesters, selectedSubjects, selectedStudents, reportLines };

  // RabbitMQ 큐에 데이터 전송
  channel.sendToQueue('report_queue', Buffer.from(JSON.stringify(reportData)), { persistent: true });

  res.status(200).send({ message: 'Report generation request submitted successfully' });
};

module.exports = { generateReport };