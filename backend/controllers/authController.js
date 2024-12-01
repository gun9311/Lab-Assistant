const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const redisClient = require("../utils/redisClient");
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const login = async (req, res) => {
  const { role, password, fcmToken, ...loginData } = req.body;

  try {
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ name: loginData.name });
    } else if (role === 'teacher') {
      user = await Teacher.findOne({ email: loginData.email });
    } else if (role === 'student') {
      user = await Student.findOne({
        loginId: loginData.loginId,
      });
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("Invalid login credentials");
      return res.status(401).send({ error: "Invalid login credentials" });
    }

    // FCM 토큰을 tokens 필드에 추가
    if (fcmToken) {
      const tokenExists = user.tokens.some(tokenObj => tokenObj.token === fcmToken);
      if (!tokenExists) {
        user.tokens.push({ token: fcmToken });
        await user.save();
      }
    }

    const accessToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await redisClient
      .set(user._id.toString(), refreshToken, "EX", 7 * 24 * 60 * 60)
      .then(() => {})
      .catch((err) => {
        console.error("Failed to save refresh token in Redis:", err);
      });

    const response = {
      accessToken,
      refreshToken,
      userId: user._id,
      role: user.role
    };

    if (role !== 'admin') {
      response.school = user.school; // 학교명을 응답에 추가
    }

    if (role == 'student') {
      response.grade = user.grade; // 학년을 응답에 추가
    }

    res.send(response);
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({ error: "Internal server error" });
  }
};

const logout = async (req, res) => {
  const { userId } = req.body;

  try {
    await redisClient.del(userId.toString());
    res.send({ message: "Logout successful" });
  } catch (error) {
    res.status(500).send({ error: "Failed to logout" });
  }
};

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const storedToken = await redisClient.get(decoded._id.toString());

    if (storedToken !== refreshToken) {
      return res.status(401).send({ error: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { _id: decoded._id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.send({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};

const registerTeacher = async (req, res) => {
  const { email, password, name, school, authCode } = req.body;

  const VALID_AUTH_CODE = '교사';  // 하드코딩된 인증코드

  if (authCode !== VALID_AUTH_CODE) {
    return res.status(400).send({ error: 'Invalid authentication code' });
  }

  try {
    const teacher = new Teacher({ email, password, name, school });
    await teacher.save();
    res.status(201).send(teacher);
  } catch (error) {
    res.status(400).send({ error: 'Failed to create teacher' });
  }
};

const registerStudent = async (req, res) => {
  const { loginId, studentId, name, password, grade, class: studentClass, school } = req.body;
  try {
    const student = new Student({ loginId, studentId, name, password, grade, class: studentClass, school });
    await student.save();
    res.status(201).send(student);
  } catch (error) {
    if (error.code === 11000) { // 중복된 key 에러
      res.status(400).send({ error: 'Student with the same school, grade, class, and studentId already exists' });
    } else {
      res.status(400).send({ error: 'Failed to create student' });
    }
  }
};

const registerAdmin = async (req, res) => {
  const { name, password } = req.body;
  try {
    const admin = new Admin({ name, password });
    await admin.save();
    res.status(201).send(admin);
  } catch (error) {
    if (error.code === 11000) { // 중복된 key 에러
      res.status(400).send({ error: 'Admin with the same name already exists' });
    } else {
      res.status(400).send({ error: 'Failed to create admin' });
    }
  }
};

const registerStudentByTeacher = async (req, res) => {
  const students = req.body; // 배열로 전송된 학생 데이터
  try {
    const createdStudents = [];
    for (const studentData of students) {
      const { loginId, studentId, name, password, grade, studentClass, school } = studentData;
      const student = new Student({ loginId, studentId, name, password, grade, class: studentClass, school });
      await student.save();
      createdStudents.push(student);
    }
    res.status(201).send(createdStudents);
  } catch (error) {
    if (error.code === 11000) { // 중복된 key 에러
      res.status(400).send({ error: 'Student with the same school, grade, class, and studentId already exists' });
    } else {
      res.status(400).send({ error: 'Failed to create student' });
    }
  }
};

module.exports = { login, logout, refreshAccessToken, registerTeacher, registerStudent, registerAdmin, registerStudentByTeacher };
