require('dotenv').config();
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { fromEnv } = require('@aws-sdk/credential-providers');
const StudentReport = require('../models/StudentReport');

// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(),  // 환경 변수에서 자격 증명 가져오기
});

const queueUrl = process.env.REPORT_QUEUE_URL;

// 보고서 생성 요청 핸들러
const generateReport = async (req, res) => {
  const { selectedSemesters, selectedSubjects, selectedStudents, reportLines } = req.body;

  // 현재 요청을 보낸 교사의 ID를 추가
  const teacherId = req.user._id; // `req.user`에 인증 미들웨어에서 설정된 사용자 정보가 있다고 가정

  const reportData = { 
    selectedSemesters, 
    selectedSubjects, 
    selectedStudents, 
    reportLines, 
    teacherId // 교사 ID를 포함
  };

  // SQS 큐에 데이터 전송
  const params = {
    MessageBody: JSON.stringify(reportData),
    QueueUrl: queueUrl,
  };

  try {
    const command = new SendMessageCommand(params);
    await sqsClient.send(command);
    
    // 성공적으로 큐에 추가되었음을 응답
    res.status(200).send({ message: 'Report generation request submitted successfully. You will be notified upon completion.' });
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

// 특정 학생 보고서 조회 요청 핸들러
const getStudentReports = async (req, res) => {
  const { studentId, selectedSemesters, selectedSubjects } = req.body;

  try {
    const query = {
      studentId,
      semester: selectedSemesters.length > 0 ? { $in: selectedSemesters } : { $exists: true },
      subject: selectedSubjects.length > 0 ? { $in: selectedSubjects } : { $exists: true },
    };

    const reports = await StudentReport.find(query)
      .sort({ semester: 1, subject: 1 });

    res.status(200).send(reports);
  } catch (error) {
    console.error('Error querying student reports:', error);
    res.status(500).send({ message: 'Error querying student reports' });
  }
};

module.exports = { generateReport, queryReport, getStudentReports };
