const amqp = require('amqplib/callback_api');
const StudentReport = require('../models/StudentReport');
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

// 보고서 조회 요청 핸들러
const queryReport = async (req, res) => {
  const { selectedSemesters, selectedSubjects, selectedStudents } = req.body;

  try {
    const query = {
      semester: { $in: selectedSemesters },
      subject: { $in: selectedSubjects },
      studentId: { $in: selectedStudents }
    };

    const reports = await StudentReport.find(query)
      .populate('studentId', 'studentId name') // 학생의 출석번호와 이름을 포함하여 조인
      .sort({ 'studentId.studentId': 1 });

    res.status(200).send(reports);
  } catch (error) {
    console.error('Error querying reports:', error);
    res.status(500).send({ message: 'Error querying reports' });
  }
};

module.exports = { generateReport, queryReport };