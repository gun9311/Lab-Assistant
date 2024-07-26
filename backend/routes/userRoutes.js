const express = require('express');
const { getStudents, getStudentQuizResults, getStudentQuestions, getStudentChatSummary, createStudent, getStudentReport, getProfile, updateProfile, deleteProfile } = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/teacher/students', auth('teacher'), getStudents);
router.post('/teacher/students', auth('teacher'), createStudent);
router.get('/teacher/students/:studentId/quizResults', auth('teacher'), getStudentQuizResults);
router.get('/teacher/students/:studentId/questions', auth('teacher'), getStudentQuestions);
router.get('/teacher/students/:studentId/chatSummary', auth('teacher'), getStudentChatSummary);
router.get('/teacher/students/:studentId/report', auth('teacher'), getStudentReport);
router.get('/profile', auth(), getProfile);
router.put('/profile', auth(), updateProfile);
router.delete('/profile', auth(), deleteProfile);

module.exports = router;
