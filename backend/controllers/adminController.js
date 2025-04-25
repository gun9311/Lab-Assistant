const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

const getStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).send(students);
  } catch (error) {
    res.status(500).send({ error: "학생 정보를 불러오는데 실패했습니다." });
  }
};

const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).send(teachers);
  } catch (error) {
    res.status(500).send({ error: "교사 정보를 불러오는데 실패했습니다." });
  }
};

module.exports = { getStudents, getTeachers };
