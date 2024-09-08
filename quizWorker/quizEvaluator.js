const { spawn } = require("child_process");
const mongoose = require("mongoose");
const { Schema } = mongoose;
const axios = require("axios");
require("dotenv").config();

// 스키마 정의 및 인덱스 최적화
const taskSchema = new mongoose.Schema({
  taskText: { type: String, required: true }, 
  correctAnswer: { type: String, required: true }, 
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
  correctAnswer: { type: String, required: true },
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
    const correctAnswer = matchedTask.correctAnswer;
    const taskText = matchedTask.taskText;

    // 3. 비동기 처리 최적화: 파이썬 프로세스를 spawn으로 비동기 처리
    let similarity = 0.0;
    if (task.studentAnswer.trim() !== "") {
      similarity = await calculateSimilarity(task.studentAnswer, correctAnswer);
      similarity = Math.round(similarity * 10000) / 100;
    } else {
      console.log(`Question ID ${task.questionId} has no student answer, assigning similarity 0.`);
    }

    return {
      questionId: task.questionId,
      taskText,
      correctAnswer,
      studentAnswer: task.studentAnswer,
      similarity,
    };
  }));

  // 4. 결과 처리 최적화: 배치로 MongoDB에 저장
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

  // 완료 후 백엔드 서버에 알림
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

// 비동기적으로 파이썬 프로세스를 호출하여 유사도 계산
const calculateSimilarity = (studentAnswer, correctAnswer) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.NODE_ENV === "production"
      ? "/app/venv/bin/python3"
      : "C:\\Users\\Master\\Desktop\\Lab-Assistant\\worker\\env\\Scripts\\python.exe";

    const scriptPath = process.env.NODE_ENV === "production"
      ? "/app/similarity.py"
      : "C:\\Users\\Master\\Desktop\\Lab-Assistant\\quizWorker\\similarity.py";

    const pythonProcess = spawn(pythonPath, [scriptPath, studentAnswer, correctAnswer]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0 || errorOutput) {
        console.error(`Python process failed with code ${code}: ${errorOutput}`);
        return reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
      }
      const similarity = parseFloat(output.trim());
      if (isNaN(similarity)) {
        console.log("유사도 NaN");
        return resolve(0.0); // 유효하지 않은 값이면 0.0 반환
      }
      resolve(similarity);
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
