const axios = require("axios");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("dotenv").config();

// 스키마 정의 및 인덱스 최적화
const taskSchema = new mongoose.Schema({
  taskText: { type: String, required: true },
  correctAnswers: [{ type: String, required: true }]  // 각 문제에 대해 하나 이상의 정답을 요구함
});

const quizSchema = new mongoose.Schema({
  grade: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  unit: { type: String, required: true },
  tasks: [taskSchema],
});

// 인덱스 설정
quizSchema.index({ grade: 1, semester: 1, subject: 1, unit: 1 }, { unique: true });
quizSchema.index({ 'tasks._id': 1 });

const Quiz = mongoose.model("Quiz", quizSchema);

const resultSchema = new mongoose.Schema({
  questionId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  taskText: { type: String, required: true },
  correctAnswer: { type: String, required: true },  // 대표 정답만 저장
  studentAnswer: { type: String, required: false },
  similarity: { type: Number, required: true },
});

const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },
  results: [resultSchema],
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

quizResultSchema.index({ studentId: 1, subject: 1, semester: 1, unit: 1 });

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

// 퀴즈 평가 함수에서 결과 처리
const evaluateQuiz = async (quizData) => {
  const questionIds = quizData.answers.map(task => task.questionId);

  const correctTasks = await Quiz.find(
    { "tasks._id": { $in: questionIds } },
    { tasks: 1 }
  );

  const results = await Promise.all(quizData.answers.map(async (task) => {
    const correctTask = correctTasks.find(q => q.tasks.some(t => t._id.equals(task.questionId)));

    if (!correctTask) {
      throw new Error(`Quiz question with ID ${task.questionId} not found`);
    }

    const matchedTask = correctTask.tasks.find(t => t._id.equals(task.questionId));
    const correctAnswers = matchedTask.correctAnswers;
    const taskText = matchedTask.taskText;

    let similarity = 0.0;
    let bestAnswer = "";

    // 학생이 답변을 하지 않았을 때 처리
    if (task.studentAnswer.trim() !== "") {
      const { maxSimilarity, bestMatch } = await calculateMaxSimilarity(task.studentAnswer, correctAnswers);
      similarity = Math.round(maxSimilarity * 10000) / 100;
      bestAnswer = bestMatch || correctAnswers[0]; // bestMatch가 없을 때 첫 번째 정답을 기본값으로 설정
    } else {
      console.log(`Question ID ${task.questionId} has no student answer, assigning similarity 0.`);
      bestAnswer = correctAnswers.length > 0 ? correctAnswers[0] : "N/A"; // 기본값 처리
    }

    return {
      questionId: task.questionId,
      taskText,
      correctAnswer: bestAnswer,  // 여기에서 올바르게 정답을 설정
      studentAnswer: task.studentAnswer,
      similarity,
    };
  }));

  // 결과 처리
  const averageScore = Math.round(
    (results.reduce((sum, result) => sum + result.similarity, 0) / results.length) * 100
  ) / 100;

  const quizResultData = {
    studentId: new mongoose.Types.ObjectId(quizData.studentId),
    subject: quizData.subject,
    semester: quizData.semester,
    unit: quizData.unit,
    results,
    score: averageScore,
  };

  await saveQuizResult(quizResultData);

  try {
    await axios.post(process.env.QUIZ_NOTIFICATION_API_URL, {
      studentId: quizData.studentId,
      quizId: quizData.quizId,
      subject: quizData.subject,
      semester: quizData.semester,
      unit: quizData.unit,
    });
    console.log("Quiz completion notification sent.");
  } catch (error) {
    console.error("Failed to notify backend server about quiz completion:", error);
  }

  return {
    score: averageScore,
  };
};

// 유사도 계산 함수 (최대 유사도 및 해당 정답 반환)
const calculateMaxSimilarity = async (studentAnswer, correctAnswers) => {
  // console.log(`Calculating similarity for student answer: ${studentAnswer}`);
  // console.log(`Correct answers: ${correctAnswers.join(", ")}`);

  const similarities = await Promise.all(
    correctAnswers.map(correctAnswer => calculateSimilarity(studentAnswer, correctAnswer))
  );

  // console.log(`Similarities: ${similarities}`);

  const maxSimilarity = Math.max(...similarities);
  const bestMatchIndex = similarities.indexOf(maxSimilarity);
  const bestMatch = correctAnswers[bestMatchIndex];

  // console.log(`Best match: ${bestMatch} with similarity: ${maxSimilarity}`);

  // maxSimilarity 값 검증
  if (isNaN(maxSimilarity)) {
    throw new Error("Invalid similarity value");
  }

  return { maxSimilarity, bestMatch };
};

// Python API로 유사도 계산 요청
const calculateSimilarity = async (studentAnswer, correctAnswer) => {
  try {
    const response = await axios.post('http://flask:7000/similarity', {
      answer: studentAnswer,
      correct_answer: correctAnswer
    });

    const similarity = response.data.similarity;
    // console.log(`Similarity: ${similarity}`);
    return similarity;
  } catch (error) {
    console.error(`Error calculating similarity: ${error}`);
    throw new Error("Similarity calculation failed.");
  }
};

// 결과를 저장하는 함수
const saveQuizResult = async (quizData) => {
  const { studentId, subject, semester, unit, results, score } = quizData;
  try {
    const quizResult = new QuizResult({
      studentId,
      subject,
      semester,
      unit,
      results,
      score,
    });
    await quizResult.save();
  } catch (error) {
    console.error("Failed to save quiz result:", error);
    throw error;
  }
};

module.exports = { evaluateQuiz };
