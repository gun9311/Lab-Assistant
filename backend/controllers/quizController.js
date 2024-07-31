require('dotenv').config();
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { fromEnv } = require('@aws-sdk/credential-providers');
const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject'); // 경로를 필요에 따라 조정하세요

// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(), // 환경 변수에서 자격 증명 가져오기
});

const queueUrl = process.env.SQS_URL;

const getQuiz = async (req, res) => {
  const { grade, semester, subject, unit } = req.query;

  try {
    const quiz = await Quiz.findOne({ grade, semester, subject, unit });
    if (!quiz) {
      return res.status(404).send({ error: '퀴즈를 찾을 수 없습니다' });
    }
    res.status(200).send(quiz);
  } catch (error) {
    console.error('퀴즈를 가져오는 중 오류 발생:', error);
    res.status(500).send({ error: '퀴즈를 가져오는 데 실패했습니다' });
  }
};

const submitQuiz = async (req, res) => {
  const quizData = req.body;

  // SQS 큐에 데이터 전송
  const params = {
    MessageBody: JSON.stringify(quizData),
    QueueUrl: queueUrl,
  };

  try {
    const command = new SendMessageCommand(params);
    await sqsClient.send(command);
    res.status(200).send({ message: 'Quiz submitted successfully' });
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
        tasks
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
