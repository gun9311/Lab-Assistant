const express = require('express');
const { getStudents, getTeachers } = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/students', auth('admin'), getStudents);
router.get('/teachers', auth('admin'), getTeachers);

module.exports = router;