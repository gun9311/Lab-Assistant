const { spawn } = require("child_process");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const axios = require("axios");
require("dotenv").config();

// 스키마 정의 및 인덱스 최적화
const taskSchema = new mongoose.Schema({
  taskText: { type: String, required: true },
  correctAnswers: [{ type: String, required: true }] // 각 문제에 대해 하나 이상의 정답을 요구함
});

const quizSchema = new mongoose.Schema({
  grade: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  unit: { type: String, required: true },
  tasks: [taskSchema],
});

// 인덱스 최적화
quizSchema.index({ grade: 1, semester: 1, subject: 1, unit: 1 }, { unique: true });
quizSchema.index({ 'tasks._id': 1 }); // 서브 도큐먼트에 인덱스 추가

const Quiz = mongoose.model("Quiz", quizSchema);

const resultSchema = new mongoose.Schema({
  questionId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  taskText: { type: String, required: true },
  correctAnswer: { type: String, required: true }, // 대표 정답만 저장
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

// 복합 인덱스 설정
quizResultSchema.index({ studentId: 1, subject: 1, semester: 1, unit: 1 });

const QuizResult = mongoose.model("QuizResult", quizResultSchema);

// 퀴즈 평가 함수
const evaluateQuiz = async (quizData) => {
  const questionIds = quizData.answers.map(task => task.questionId);

  // 1. 데이터베이스 최적화: batch 쿼리로 한 번에 모든 문제를 가져오기
  const correctTasks = await Quiz.find(
    { "tasks._id": { $in: questionIds } },
    { tasks: 1 }
  );

  // 2. 비동기 최적화: Promise.all로 병렬 처리
  const results = await Promise.all(quizData.answers.map(async (task) => {
    const correctTask = correctTasks.find(q => q.tasks.some(t => t._id.equals(task.questionId)));
    
    if (!correctTask) {
      throw new Error(`Quiz question with ID ${task.questionId} not found`);
    }

    const matchedTask = correctTask.tasks.find(t => t._id.equals(task.questionId));
    const correctAnswers = matchedTask.correctAnswers; // 여러 정답 배열
    const taskText = matchedTask.taskText;

    let similarity = 0.0;
    let bestAnswer = "";

    if (task.studentAnswer.trim() !== "") {
      const { maxSimilarity, bestMatch } = await calculateMaxSimilarity(task.studentAnswer, correctAnswers);
      similarity = Math.round(maxSimilarity * 10000) / 100;
      bestAnswer = bestMatch || ""; // bestMatch가 없으면 빈 문자열로 처리
    } else {
      console.log(`Question ID ${task.questionId} has no student answer, assigning similarity 0.`);
    }

    // bestAnswer가 없을 때 기본값 할당
    if (!bestAnswer) {
      console.warn(`No best answer found for question ID ${task.questionId}. Defaulting to first correct answer.`);
      if (correctAnswers.length > 0) {
        bestAnswer = correctAnswers[0];
      } else {
        console.error(`No correct answers available for question ID ${task.questionId}.`);
        bestAnswer = "N/A"; // 기본값으로 처리
      }
    }

    return {
      questionId: task.questionId,
      taskText,
      correctAnswer: bestAnswer, // 가장 높은 유사도를 가진 대표 정답만 저장
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
  } catch (error) {
    console.error("Failed to notify backend server about quiz completion:", error);
  }

  return {
    score: averageScore,
  };
};

// 유사도 계산 함수 (최대 유사도 및 해당 정답 반환)
const calculateMaxSimilarity = async (studentAnswer, correctAnswers) => {
  const similarities = await Promise.all(
    correctAnswers.map(correctAnswer => calculateSimilarity(studentAnswer, correctAnswer))
  );

  // 가장 높은 유사도를 가진 정답을 찾음
  const maxSimilarity = Math.max(...similarities);
  const bestMatchIndex = similarities.indexOf(maxSimilarity);
  const bestMatch = correctAnswers[bestMatchIndex];

  return { maxSimilarity, bestMatch }; // 유사도와 해당 정답을 함께 반환
};

// 비동기적으로 파이썬 프로세스를 호출하여 유사도 계산
// 비동기적으로 파이썬 프로세스를 호출하여 유사도 계산
const calculateSimilarity = (studentAnswer, correctAnswer) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.NODE_ENV === "production"
      ? "/app/venv/bin/python3"
      : "C:\\Users\\Master\\Desktop\\Lab-Assistant\\worker\\env\\Scripts\\python.exe";

    const scriptPath = process.env.NODE_ENV === "production"
      ? "/app/similarity.py"
      : "C:\\Users\\Master\\Desktop\\Lab-Assistant\\quizWorker\\similarity.py";

    // 비동기적으로 프로세스를 실행
    const pythonProcess = spawn(pythonPath, [scriptPath, studentAnswer, correctAnswer]);

    let output = "";
    let errorOutput = "";

    // stdout에서 데이터가 들어올 때마다 output에 추가
    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    // stderr에서 에러가 발생하면 errorOutput에 추가
    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // 프로세스가 완료되면 close 이벤트로 처리
    pythonProcess.on("close", (code) => {
      if (code !== 0 || errorOutput) {
        console.error(`Python process failed with code ${code} and error: ${errorOutput}`);
        return reject(new Error(`Python process failed with error: ${errorOutput}`));
      }

      const similarity = parseFloat(output.trim());
      if (isNaN(similarity)) {
        console.log("유사도 NaN");
        return resolve(0.0); // 유효하지 않은 값이면 0.0 반환
      }

      resolve(similarity); // 유효한 유사도 값 반환
    });

    // 프로세스 실행 중에 에러가 발생할 경우
    pythonProcess.on("error", (error) => {
      console.error(`Python process encountered an error: ${error}`);
      reject(error);
    });
  });
};

// 결과를 배치로 저장
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
