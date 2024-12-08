const QuizResult = require('../models/QuizResult');
const KahootQuizContent = require('../models/KahootQuizContent');

const getQuizResults = async (req, res) => {
  try {
    const quizResults = await QuizResult.find({ studentId: req.user._id })
      .select('quizId subject semester unit score createdAt'); // 기본 정보만 선택
    res.status(200).json(quizResults);
  } catch (error) {
    console.error('Failed to fetch quiz results:', error);
    res.status(500).send({ error: 'Failed to fetch quiz results' });
  }
};

const getQuizResultsByStudentId = async (req, res) => {
  // console.log('퀴즈결과 호출');
  try {
    const { studentId } = req.params;
    const quizResults = await QuizResult.find({ studentId })
      .select('quizId subject semester unit score createdAt'); // 기본 정보만 선택
    res.status(200).json(quizResults);
  } catch (error) {
    console.error('Failed to fetch quiz results by student ID:', error);
    res.status(500).send({ error: 'Failed to fetch quiz results' });
  }
};

// 새로운 API 엔드포인트 추가
const getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { studentId } = req.params;
    // console.log(quizId, studentId);
  
    
    
    // 퀴즈 결과에서 학생의 답변과 정답 여부 가져오기
    const quizResult = await QuizResult.findOne({ quizId, studentId })
      .select('results');
    
    // console.log(quizResult);

    if (!quizResult) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }

    // 퀴즈 콘텐츠에서 문제의 텍스트와 정답 가져오기
    const quizContent = await KahootQuizContent.findById(quizId)
      .select('questions');

    // console.log(quizContent);

    if (!quizContent) {
      return res.status(404).json({ error: 'Quiz content not found' });
    }

    // 문제와 학생의 답변을 조합하여 반환
    const detailedResults = quizResult.results.map(result => {
      const question = quizContent.questions.find(q => q._id.equals(result.questionId));

      if (!question || !question.options[result.studentAnswer]) {
        return {
          questionText: question ? question.questionText : '문제를 찾을 수 없음',
          correctAnswer: '정답을 찾을 수 없음',
          studentAnswer: '답변을 찾을 수 없음',
          isCorrect: result.isCorrect
        };
      }

      const correctAnswerIndex = parseInt(question.correctAnswer, 10);
      const studentAnswerIndex = parseInt(result.studentAnswer, 10);
      const correctAnswerText = question.options[correctAnswerIndex]?.text || '텍스트 없음';
      const studentAnswerText = question.options[studentAnswerIndex]?.text || '텍스트 없음';

      return {
        questionText: question.questionText,
        correctAnswer: correctAnswerText,
        studentAnswer: studentAnswerText,
        isCorrect: result.isCorrect
      };
    });

    res.status(200).json(detailedResults);
  } catch (error) {
    console.error('Failed to fetch quiz details:', error);
    res.status(500).send({ error: 'Failed to fetch quiz details' });
  }
};

module.exports = { getQuizResults, getQuizResultsByStudentId, getQuizDetails };
