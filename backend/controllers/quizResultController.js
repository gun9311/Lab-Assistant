const QuizResult = require("../models/QuizResult");
const KahootQuizSession = require("../models/KahootQuizSession");
const logger = require("../utils/logger"); // G_TOKEN_REPLACEMENT_

const getQuizResults = async (req, res) => {
  try {
    const quizResults = await QuizResult.find({
      studentId: req.user._id,
    })
      .select("sessionId subject semester unit score createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(quizResults);
  } catch (error) {
    logger.error("Failed to fetch quiz results for user:", error);
    res.status(500).send({ error: "Failed to fetch quiz results" });
  }
};

const getQuizResultsByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;
    const quizResults = await QuizResult.find({ studentId })
      .select("sessionId subject semester unit score createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(quizResults);
  } catch (error) {
    logger.error("Failed to fetch quiz results by student ID:", error);
    res.status(500).send({ error: "Failed to fetch quiz results" });
  }
};

const getQuizDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user._id;

    const quizResult = await QuizResult.findOne({ sessionId, studentId });

    if (!quizResult) {
      return res
        .status(404)
        .json({
          error: "해당 세션에 대한 학생의 퀴즈 결과를 찾을 수 없습니다.",
        });
    }

    const kahootQuizSession = await KahootQuizSession.findById(
      sessionId
    ).select("questionsSnapshot");

    if (!kahootQuizSession || !kahootQuizSession.questionsSnapshot) {
      return res
        .status(404)
        .json({ error: "퀴즈 세션 정보 또는 문제 스냅샷을 찾을 수 없습니다." });
    }

    const questionsSnapshot = kahootQuizSession.questionsSnapshot;

    const detailedResults = quizResult.results.map((result) => {
      const questionFromSnapshot = questionsSnapshot.find((q) =>
        q._id.equals(result.questionId)
      );

      if (!questionFromSnapshot) {
        return {
          questionId: result.questionId,
          questionText: "질문을 찾을 수 없음 (스냅샷에 없음)",
          correctAnswer: "N/A",
          studentAnswer: "N/A",
          isCorrect: result.isCorrect,
        };
      }

      let studentAnswerText = "답변 없음";
      if (
        result.studentAnswer !== null &&
        result.studentAnswer !== undefined &&
        result.studentAnswer !== -1
      ) {
        studentAnswerText =
          questionFromSnapshot.options[result.studentAnswer]?.text ||
          `선택지 (${result.studentAnswer}) 없음`;
      } else if (result.studentAnswer === -1) {
        studentAnswerText = "시간 초과";
      }

      const correctAnswerText =
        questionFromSnapshot.options[
          parseInt(questionFromSnapshot.correctAnswer, 10)
        ]?.text || "정답 선택지 없음";

      return {
        questionId: questionFromSnapshot._id,
        questionText: questionFromSnapshot.questionText,
        correctAnswer: correctAnswerText,
        studentAnswer: studentAnswerText,
        isCorrect: result.isCorrect,
      };
    });

    res.status(200).json(detailedResults);
  } catch (error) {
    logger.error("Failed to fetch quiz details:", error);
    res
      .status(500)
      .send({ error: "퀴즈 상세 정보를 가져오는데 실패했습니다." });
  }
};

module.exports = { getQuizResults, getQuizResultsByStudentId, getQuizDetails };
