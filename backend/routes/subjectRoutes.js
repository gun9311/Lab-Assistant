const express = require('express');
const { addSubject, getSubjects, addUnits, getUnits, addUnitRating } = require('../controllers/subjectController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/add-subject', auth('admin'), addSubject);
router.post('/add-units', auth('admin'), addUnits); // 단수형 add-unit에서 복수형 add-units로 변경
router.get('/', auth(), getSubjects);
router.get('/units', auth(), getUnits); // 학년, 학기, 과목에 따라 단원을 조회
router.post('/add-unit-rating', auth('admin'), addUnitRating); // 새로운 엔드포인트 추가

module.exports = router;