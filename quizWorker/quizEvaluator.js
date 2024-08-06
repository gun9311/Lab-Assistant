const { spawnSync } = require('child_process');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const taskSchema = new mongoose.Schema({
  taskText: { type: String, required: true }, // 문제 텍스트
  correctAnswer: { type: String, required: true } // 정답
});

const quizSchema = new mongoose.Schema({
  grade: { type: String, required: true }, // 학년
  semester: { type: String, required: true }, // 학기
  subject: { type: String, required: true }, // 과목
  unit: { type: String, required: true }, // 단원
  tasks: [taskSchema] // 문제들
});

// 복합 유일 인덱스 설정
quizSchema.index({ grade: 1, semester: 1, subject: 1, unit: 1 }, { unique: true });

const Quiz = mongoose.model('Quiz', quizSchema);

const resultSchema = new mongoose.Schema({
  questionId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true }, // 퀴즈 문제 ID
  taskText: { type: String, required: true }, // 문제 텍스트
  correctAnswer: { type: String, required: true }, // 정답
  studentAnswer: { type: String, required: true }, // 학생의 답변
  similarity: { type: Number, required: true } // 유사도 점수 (0 ~ 100)
});
// 
const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // 학생 ID
  subject: { type: String, required: true }, // 과목
  semester: { type: String, required: true }, // 학기
  unit: { type: String, required: true }, // 단원
  results: [resultSchema], // 개별 질문의 결과 배열
  score: { type: Number, required: true }, // 전체 점수 (평균 유사도 점수)
  createdAt: { type: Date, default: Date.now } // 생성 날짜
});

// 복합 인덱스 설정
quizResultSchema.index({ studentId: 1, subject: 1, semester: 1, unit: 1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

const evaluateQuiz = async (quizData) => {
  const results = [];
  const threshold = 0.8; // 유사도 임계값 설정

  for (const task of quizData.answers) {
    const correctTask = await Quiz.findOne(
      { "tasks._id": task.questionId },
      { tasks: { $elemMatch: { _id: task.questionId } } }
    );

    if (!correctTask) {
      throw new Error(`Quiz question with ID ${task.questionId} not found`);
    }

    const correctAnswer = correctTask.tasks[0].correctAnswer;
    const taskText = correctTask.tasks[0].taskText;
    const similarity = await calculateSimilarity(task.studentAnswer, correctAnswer);
    const roundedSimilarity = Math.round(similarity * 10000) / 100; // 소수점 셋째자리 반올림 후 100 곱함
    results.push({
      questionId: task.questionId,
      taskText,
      correctAnswer,
      studentAnswer: task.studentAnswer,
      similarity: roundedSimilarity
    });
  }

  const averageScore = results.reduce((sum, result) => sum + result.similarity, 0) / results.length;

  const quizResultData = {
    studentId: new mongoose.Types.ObjectId(quizData.studentId),
    subject: quizData.subject,
    semester: quizData.semester,
    unit: quizData.unit,
    results,
    score: averageScore
  };

  await saveQuizResult(quizResultData);
  return {
    score: averageScore
  };
};

const calculateSimilarity = (studentAnswer, correctAnswer) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.NODE_ENV === 'production'
      ? '/app/venv/bin/python3'
      : 'C:\\Users\\Master\\Desktop\\Lab-Assistant\\worker\\env\\Scripts\\python.exe';

    const scriptPath = process.env.NODE_ENV === 'production'
      ? '/app/similarity.py'
      : 'C:\\Users\\Master\\Desktop\\Lab-Assistant\\quizWorker\\similarity.py';
      
      const result = spawnSync(pythonPath, [scriptPath, studentAnswer, correctAnswer], { encoding: 'utf-8' });

    // const result = spawnSync(pythonPath, ['similarity.py', studentAnswer, correctAnswer], { encoding: 'utf-8' });

    if (result.error) {
      console.error(`Python process error: ${result.error}`);
      return reject(result.error);
    }

    if (result.stderr) {
      console.error(`Python stderr: ${result.stderr.toString()}`);
    }

    const output = result.stdout.toString('utf-8').trim();
    const similarity = parseFloat(output);
    if (isNaN(similarity)) {
      console.log('유사도 NaN');
      return resolve(0.0); // 유효하지 않은 값이 반환되면 0.0 사용
    }
    resolve(similarity);
  });
};

const saveQuizResult = async (quizData) => {
  const { studentId, subject, semester, unit, results, score } = quizData;
  try {
    let quizResult = await QuizResult.findOne({ studentId, subject, semester, unit });
    if (!quizResult) {
      quizResult = new QuizResult({ studentId, subject, semester, unit, results, score });
    } else {
      quizResult.results.push(...results);
      quizResult.score = quizResult.results.reduce((sum, result) => sum + result.similarity, 0) / quizResult.results.length;
    }
    await quizResult.save();
  } catch (error) {
    console.error('Failed to save quiz result:', error);
    throw error;
  }
};

module.exports = { evaluateQuiz };
