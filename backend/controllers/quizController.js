const Quiz = require('../models/Quiz');
const Subject = require('../models/Subject'); // 경로를 필요에 따라 조정하세요

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

const submitQuiz = (req, res) => {
  const channel = req.channel; // req 객체에서 채널 가져오기
  const quizData = req.body;

  // RabbitMQ 큐에 데이터 전송
  channel.sendToQueue('quiz_queue', Buffer.from(JSON.stringify(quizData)), { persistent: true });
  res.status(200).send({ message: 'Quiz submitted successfully' });
};

const addQuiz = async (req, res) => {
  const { subjectId, unitName, tasks } = req.body;

  try {
    // 과목을 ID로 찾기
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ error: '과목을 찾을 수 없습니다' });
    }

    // 단원을 과목 내에서 찾기
    const unit = subject.units.find(u => u.name === unitName);
    if (!unit) {
      return res.status(404).send({ error: '단원을 찾을 수 없습니다' });
    }

    // 기존 퀴즈를 찾기
    const existingQuiz = await Quiz.findOne({
      grade: subject.grade,
      semester: subject.semester,
      subject: subject.name,
      unit: unitName
    });

    if (existingQuiz) {
      // 기존 퀴즈에 새로운 tasks 추가
      existingQuiz.tasks.push(...tasks);
      await existingQuiz.save();
      res.status(200).send(existingQuiz);
    } else {
      // 새로운 퀴즈 데이터 생성
      const quizData = {
        grade: subject.grade,
        semester: subject.semester,
        subject: subject.name,
        unit: unitName,
        tasks
      };

      // 새로운 퀴즈 저장
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
