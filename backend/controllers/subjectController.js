const Subject = require('../models/Subject');

// 과목 추가
const addSubject = async (req, res) => {
  const { name, grade, semester, units } = req.body;
  try {
    const subject = new Subject({ name, grade, semester, units });
    await subject.save();
    res.status(201).send(subject);
  } catch (error) {
    res.status(400).send({ error: 'Failed to add subject' });
  }
};

// 과목 조회
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.status(200).send(subjects);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch subjects' });
  }
};

// 단원 조회
const getUnits = async (req, res) => {
  const { grade, semester, subject } = req.query;
  try {
    const subjectDoc = await Subject.findOne({ grade, semester, name: subject });
    if (!subjectDoc) {
      return res.status(404).send({ error: 'Subject not found' });
    }
    res.status(200).send({ units: subjectDoc.units });
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch units' });
  }
};

// 여러 개의 유닛 추가
const addUnits = async (req, res) => {
  const { subject, units } = req.body; // units는 배열로 받음
  if (!subject || !units || !Array.isArray(units)) {
    return res.status(400).send({ error: 'Invalid data format' });
  }

  try {
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(404).send({ error: 'Subject not found' });
    }

    units.forEach(unit => subjectDoc.units.push({ name: unit }));
    await subjectDoc.save();
    res.status(200).send(subjectDoc);
  } catch (error) {
    console.error('Error adding units:', error);
    res.status(500).send({ error: 'Failed to add units' });
  }
};

const addUnitRating = async (req, res) => {
  const { subjectId, unitName, ratingLevel, comment } = req.body;
  try {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ error: 'Subject not found' });
    }

    const unit = subject.units.find(u => u.name === unitName);
    if (!unit) {
      return res.status(404).send({ error: 'Unit not found' });
    }

    let rating = unit.ratings.find(r => r.level === ratingLevel);
    if (!rating) {
      rating = { level: ratingLevel, comments: [] };
      unit.ratings.push(rating);
    }

    // 중복된 평어가 존재하는지 확인
    if (!rating.comments.includes(comment)) {
      rating.comments.push(comment);
    }

    await subject.save();
    res.status(200).send(subject);
  } catch (error) {
    console.error('Error adding unit rating:', error);
    res.status(500).send({ error: 'Failed to add unit rating' });
  }
};

module.exports = { addSubject, getSubjects, getUnits, addUnits, addUnitRating };
