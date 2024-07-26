const QuizResult = require('../models/QuizResult');

const getQuizResults = async (req, res) => {
  try {
    const quizResults = await QuizResult.find({ studentId: req.user._id });

    res.status(200).json(quizResults);
  } catch (error) {
    console.error('Failed to fetch quiz results:', error);
    res.status(500).send({ error: 'Failed to fetch quiz results' });
  }
};

module.exports = { getQuizResults };
