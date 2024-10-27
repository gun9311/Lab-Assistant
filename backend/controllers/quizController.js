require('dotenv').config();
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { fromEnv } = require('@aws-sdk/credential-providers');
const Quiz = require('../models/Quiz');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(), // 환경 변수에서 자격 증명 가져오기
});

const queueUrl = process.env.QUIZ_QUEUE_URL;

const getQuiz = async (req, res) => {
  const { grade, semester, subject, unit } = req.query;
  const studentId = req.user._id; // 인증된 학생의 ID

  try {
    // 퀴즈를 먼저 조회합니다.
    const quiz = await Quiz.findOne({ grade, semester, subject, unit });
    if (!quiz) {
      return res.status(404).send({ error: '퀴즈를 찾을 수 없습니다' });
    }

    // 학생 정보 가져오기
    const student = await Student.findById(studentId);

    // 해당 학생이 이미 제출한 퀴즈인지 확인 (quizId로 확인)
    const submittedQuiz = student.submittedQuizzes.find(
      (submittedQuiz) => submittedQuiz.quizId.toString() === quiz._id.toString()
    );

    if (submittedQuiz) {
      return res.status(400).send({ message: '이미 제출한 퀴즈입니다.' });
    }

    // 제출 기록이 없다면 퀴즈를 반환합니다.
    res.status(200).send(quiz);
  } catch (error) {
    console.error('퀴즈를 가져오는 중 오류 발생:', error);
    res.status(500).send({ error: '퀴즈를 가져오는 데 실패했습니다' });
  }
};

const submitQuiz = async (req, res) => {
  const quizData = req.body;
  const studentId = req.user._id; // 인증된 학생의 ID

  // SQS 큐에 데이터 전송
  const params = {
    MessageBody: JSON.stringify(quizData),
    QueueUrl: queueUrl,
  };

  try {
    const command = new SendMessageCommand(params);
    await sqsClient.send(command);

    // 학생 데이터를 데이터베이스에서 가져옴
    const student = await Student.findById(studentId);

    // 제출 기록을 학생 데이터에 추가
    student.submittedQuizzes.push({ quizId: quizData.quizId, submittedAt: new Date() });
    await student.save();
    
    // 채점 완료 알림 메시지 추가
    res.status(200).send({ message: '퀴즈가 성공적으로 제출되었습니다. 채점이 완료되면 알림이 발송됩니다.' });
  } catch (error) {
    console.error('Failed to send message to SQS:', error);
    res.status(500).send({ message: 'Failed to send message to SQS' });
  }
};

const addQuiz = async (req, res) => {
  const { subjectId, unitName, tasks } = req.body;

  try {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ error: '과목을 찾을 수 없습니다' });
    }

    const unit = subject.units.find(u => u.name === unitName);
    if (!unit) {
      return res.status(404).send({ error: '단원을 찾을 수 없습니다' });
    }

    const existingQuiz = await Quiz.findOne({
      grade: subject.grade,
      semester: subject.semester,
      subject: subject.name,
      unit: unitName
    });

    if (existingQuiz) {
      existingQuiz.tasks.push(...tasks);
      await existingQuiz.save();
      res.status(200).send(existingQuiz);
    } else {
      const quizData = {
        grade: subject.grade,
        semester: subject.semester,
        subject: subject.name,
        unit: unitName,
        tasks: tasks.map(task => ({
          taskText: task.taskText,
          correctAnswers: task.correctAnswers // correctAnswer를 배열로 받음
        }))
      };

      const newQuiz = new Quiz(quizData);
      await newQuiz.save();
      res.status(200).send(newQuiz);
    }
  } catch (error) {
    console.error('퀴즈 추가 중 오류 발생:', error);
    res.status(500).send({ error: '퀴즈 추가에 실패했습니다' });
  }
};

module.exports = { submitQuiz, addQuiz, getQuiz };
