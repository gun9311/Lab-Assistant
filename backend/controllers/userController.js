const User = require("../models/Admin");
const QuizResult = require("../models/QuizResult");
const Question = require("../models/Question");
const ChatSummary = require("../models/ChatSummary");
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const getStudents = async (req, res) => {
  const { school, grade, class: classNumber } = req.query;
  
  try {
    const students = await Student.find({ school, grade, class: classNumber });
    res.status(200).send(students);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch students' });
  }
};

const createStudent = async (req, res) => {
  const { username, password, grade } = req.body;
  try {
    const student = new User({ username, password, role: "student", grade });
    await student.save();
    res.status(201).send(student);
  } catch (error) {
    res.status(400).send({ error: "Failed to create student" });
  }
};

const getStudentQuizResults = async (req, res) => {
  const { studentId } = req.params;
  try {
    const quizResults = await QuizResult.find({ student: studentId });
    res.status(200).send(quizResults);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch quiz results" });
  }
};

const getStudentQuestions = async (req, res) => {
  const { studentId } = req.params;
  try {
    const questions = await Question.find({ student: studentId });
    res.status(200).send(questions);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch questions" });
  }
};

const getStudentChatSummary = async (req, res) => {
  const { studentId } = req.params;
  try {
    const chatSummary = await ChatSummary.find({ student: studentId });
    res.status(200).send(chatSummary);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch chat summary" });
  }
};

const getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const quizResults = await QuizResult.find({ studentId });
    const chatSummaries = await ChatSummary.find({ studentId });

    const report = await generateReport(quizResults, chatSummaries);
    res.status(200).send(report);
  } catch (error) {
    res.status(500).send({ error: "Failed to generate student report" });
  }
};

const getProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findById(req.user._id);
    }
    
    if (!user) {
      return res.status(404).send({ error: 'User not found' });
    }

    res.send(user);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = req.user.role === 'teacher' ? ['name', 'school', 'phone', 'password'] : ['name', 'school', 'phone', 'password', 'grade', 'class'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).send();
    }

    updates.forEach(update => user[update] = req.body[update]);
    await user.save();

    res.send(user);
  } catch (error) {
    res.status(400).send(error);
  }
};

const deleteProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'teacher') {
      user = await Teacher.findByIdAndDelete(req.user._id);
    } else if (req.user.role === 'student') {
      user = await Student.findByIdAndDelete(req.user._id);
    }

    if (!user) {
      return res.status(404).send();
    }

    res.send({ message: 'User deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
};

module.exports = {
  getStudents,
  createStudent,
  getStudentQuizResults,
  getStudentQuestions,
  getStudentChatSummary,
  getStudentReport,
  getProfile, 
  updateProfile,
  deleteProfile,
};
