require('dotenv').config();
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { fromEnv } = require('@aws-sdk/credential-providers');
const StudentReport = require('../models/StudentReport');

// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(),  // 환경 변수에서 자격 증명 가져오기
});

const queueUrl = process.env.SQS_URL;

// 보고서 생성 요청 핸들러
const generateReport = async (req, res) => {
  const { selectedSemesters, selectedSubjects, selectedStudents, reportLines } = req.body;

  const reportData = { selectedSemesters, selectedSubjects, selectedStudents, reportLines };

  // SQS 큐에 데이터 전송
  const params = {
    MessageBody: JSON.stringify(reportData),
    QueueUrl: queueUrl,
  };

  try {
    const command = new SendMessageCommand(params);
    await sqsClient.send(command);
    res.status(200).send({ message: 'Report generation request submitted successfully' });
  } catch (error) {
    console.error('Failed to send message to SQS:', error);
    res.status(500).send({ message: 'Failed to send message to SQS' });
  }
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
