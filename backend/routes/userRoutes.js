const express = require('express');
const { getStudents, getProfile, updateProfile, deleteProfile } = require('../controllers/userController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/teacher/students', auth('teacher'), getStudents);
router.get('/profile', auth(), getProfile);
router.put('/profile', auth(), updateProfile);
router.delete('/profile', auth(), deleteProfile);

module.exports = router;
