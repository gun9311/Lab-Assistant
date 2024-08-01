const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

const getStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).send(students);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch students' });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).send(teachers);
  } catch (error) {
    res.status(500).send({ error: 'Failed to fetch teachers' });
  }
};

module.exports = { getStudents, getTeachers };
