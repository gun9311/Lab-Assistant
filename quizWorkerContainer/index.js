const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const mongoose = require('mongoose');
const { spawnSync } = require('child_process');
require('dotenv').config();

const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    grade: { type: Number, required: true },
    class: { type: String, required: true },
    school: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    role: { type: String, default: 'student' },
    tokens: [{ token: { type: String, required: true } }],
});

const Student = mongoose.model('Student', studentSchema);

const resultSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  taskText: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  studentAnswer: { type: String, required: true },
  similarity: { type: Number, required: true }
});

const quizResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },
  results: [resultSchema],
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
});

const queueUrl = process.env.QUIZ_QUEUE_URL;

const processMessage = async (message) => {
  const quizData = JSON.parse(message.Body);
  console.log('Received quiz data:', quizData);
  try {
    await mongoose.connect(process.env.MONGODB_URL, {});

    const result = await evaluateQuiz(quizData);
    console.log('Evaluation result:', result);

    const deleteParams = {
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    };
    const deleteCommand = new DeleteMessageCommand(deleteParams);
    await sqsClient.send(deleteCommand);
    console.log('Message deleted:', message.ReceiptHandle);
  } catch (error) {
    console.error('Failed to evaluate quiz:', error);
  } finally {
    mongoose.connection.close();
  }
};

const evaluateQuiz = async (quizData) => {
  const results = [];
  const threshold = 0.8;

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
    const roundedSimilarity = Math.round(similarity * 10000) / 100;
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
    const pythonPath = '/app/similarity.py';
    const result = spawnSync('python3', [pythonPath, studentAnswer, correctAnswer], { encoding: 'utf-8' });

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
      return resolve(0.0);
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

exports.handler = async (event) => {
  for (const record of event.Records) {
    await processMessage(record);
  }
};
