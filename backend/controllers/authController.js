const { OAuth2Client } = require("google-auth-library");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const redisClient = require("../utils/redisClient");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleLogin = async (req, res) => {
  const { code, fcmToken } = req.body;

  try {
    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    let teacher = await Teacher.findOne({ email });

    if (!teacher) {
      return res.send({
        message:
          "Google authentication successful, please complete registration.",
        email,
      });
    }

    // FCM 토큰을 tokens 필드에 추가
    if (fcmToken) {
      const tokenExists = teacher.tokens.some(
        (tokenObj) => tokenObj.token === fcmToken
      );
      if (!tokenExists) {
        teacher.tokens.push({ token: fcmToken });
        await teacher.save();
      }
    }

    const accessToken = jwt.sign(
      { _id: teacher._id, role: teacher.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { _id: teacher._id, role: teacher.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await redisClient.set(
      teacher._id.toString(),
      refreshToken,
      "EX",
      7 * 24 * 60 * 60
    );

    res.send({
      accessToken,
      refreshToken,
      userId: teacher._id,
      role: teacher.role,
      school: teacher.school,
    });
  } catch (error) {
    res.status(400).send({ error: "Google login failed" });
  }
};

// authController.js
const completeRegistration = async (req, res) => {
  const { name, school, authCode, fcmToken, email } = req.body;

  const VALID_AUTH_CODE = "교사"; // 하드코딩된 인증코드

  if (authCode !== VALID_AUTH_CODE) {
    return res.status(400).send({ error: "Invalid authentication code" });
  }

  try {
    const teacher = new Teacher({ email, name, school });

    // FCM 토큰을 tokens 필드에 추가
    if (fcmToken) {
      teacher.tokens.push({ token: fcmToken });
    }

    await teacher.save();

    // 가입 후 로그인 처리
    const accessToken = jwt.sign(
      { _id: teacher._id, role: teacher.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { _id: teacher._id, role: teacher.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Redis에 리프레시 토큰 저장
    await redisClient.set(
      teacher._id.toString(),
      refreshToken,
      "EX",
      7 * 24 * 60 * 60
    );

    res
      .status(201)
      .send({
        message: "Registration complete",
        accessToken,
        refreshToken,
        userId: teacher._id,
        role: teacher.role,
        school: teacher.school,
      });
  } catch (error) {
    res.status(400).send({ error: "Failed to complete registration" });
  }
};

const login = async (req, res) => {
  const { role, password, fcmToken, ...loginData } = req.body;

  try {
    let user;
    if (role === "admin") {
      user = await Admin.findOne({ name: loginData.name });
    } else if (role === "teacher") {
      user = await Teacher.findOne({ email: loginData.email });
    } else if (role === "student") {
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
      const tokenExists = user.tokens.some(
        (tokenObj) => tokenObj.token === fcmToken
      );
      if (!tokenExists) {
        user.tokens.push({ token: fcmToken });
        await user.save();
      }
    }

    const accessToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
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
      role: user.role,
    };

    if (role !== "admin") {
      response.school = user.school; // 학교명을 응답에 추가
    }

    if (role == "student") {
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
      { expiresIn: "1h" }
    );
    res.send({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};

const registerTeacher = async (req, res) => {
  const { email, password, name, school, authCode } = req.body;

  const VALID_AUTH_CODE = "교사"; // 하드코딩된 인증코드

  if (authCode !== VALID_AUTH_CODE) {
    return res.status(400).send({ error: "Invalid authentication code" });
  }

  try {
    const teacher = new Teacher({ email, password, name, school });
    await teacher.save();
    res.status(201).send(teacher);
  } catch (error) {
    res.status(400).send({ error: "Failed to create teacher" });
  }
};

const registerStudent = async (req, res) => {
  const {
    loginId,
    studentId,
    name,
    password,
    grade,
    class: studentClass,
    school,
  } = req.body;
  try {
    const student = new Student({
      loginId,
      studentId,
      name,
      password,
      grade,
      class: studentClass,
      school,
    });
    await student.save();
    res.status(201).send(student);
  } catch (error) {
    if (error.code === 11000) {
      // 중복된 key 에러
      res
        .status(400)
        .send({
          error:
            "Student with the same school, grade, class, and studentId already exists",
        });
    } else {
      res.status(400).send({ error: "Failed to create student" });
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
    if (error.code === 11000) {
      // 중복된 key 에러
      res
        .status(400)
        .send({ error: "Admin with the same name already exists" });
    } else {
      res.status(400).send({ error: "Failed to create admin" });
    }
  }
};

const registerStudentByTeacher = async (req, res) => {
  const students = req.body; // 배열로 전송된 학생 데이터
  const results = {
    success: [],
    failed: [],
  };

  for (const studentData of students) {
    // 필수 필드 검증
    if (
      !studentData.loginId ||
      !studentData.studentId ||
      !studentData.name ||
      !studentData.password ||
      !studentData.grade ||
      !studentData.studentClass ||
      !studentData.school
    ) {
      results.failed.push({
        studentData,
        error: "필수 필드가 누락되었습니다.",
      });
      continue;
    }
    try {
      const {
        loginId,
        studentId,
        name,
        password,
        grade,
        studentClass,
        school,
      } = studentData;
      const student = new Student({
        loginId,
        studentId,
        name,
        password,
        grade,
        class: studentClass,
        school,
      });
      await student.save();
      results.success.push(student);
    } catch (error) {
      if (error.code === 11000) {
        // 중복된 key 에러
        const duplicateField = error.keyPattern.loginId
          ? "로그인 ID"
          : "학교의 학년, 반, 출석번호";
        results.failed.push({
          studentData,
          error: `동일한 ${duplicateField}가 존재합니다. 식별코드를 변경하세요.`,
        });
      } else {
        results.failed.push({
          studentData,
          error: "학생 생성에 실패했습니다.",
        });
      }
    }
  }

  res.status(207).send(results); // 207: Multi-Status
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const sesClient = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // 1. 이메일 확인
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return res.status(400).send({ error: "등록되지 않은 이메일입니다." });
    }

    // 2. 재설정 토큰 생성
    const resetToken = jwt.sign({ _id: teacher._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // 3. 재설정 링크 생성
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    // 4. 이메일 전송 설정
    const params = {
      Source: process.env.AWS_SES_VERIFIED_EMAIL, // SES에서 검증된 발신 이메일 주소
      Destination: {
        ToAddresses: [email], // 수신자 이메일 주소
      },
      Message: {
        Subject: {
          Data: "비밀번호 재설정 요청",
        },
        Body: {
          Text: {
            Data: `안녕하세요, 아래 링크를 통해 비밀번호를 재설정하세요: ${resetLink}`,
          },
          Html: {
            Data: `<p>안녕하세요, 아래 링크를 통해 비밀번호를 재설정하세요:</p><a href="${resetLink}">${resetLink}</a>`,
          },
        },
      },
    };

    // 5. 이메일 전송
    const command = new SendEmailCommand(params);
    await sesClient.send(command);

    // 6. 성공 응답
    res
      .status(200)
      .send({ message: "비밀번호 재설정 이메일이 전송되었습니다." });
  } catch (error) {
    console.error("이메일 전송 중 오류:", error);
    res.status(500).send({ error: "이메일 전송 중 오류가 발생했습니다." });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded._id);

    if (!teacher) {
      return res.status(400).send({ error: "유효하지 않은 토큰입니다." });
    }

    teacher.password = password;
    await teacher.save();

    res.send({ message: "비밀번호가 성공적으로 재설정되었습니다." });
  } catch (error) {
    res.status(400).send({ error: "비밀번호 재설정에 실패했습니다." });
  }
};

const forgotStudentPassword = async (req, res) => {
  const { studentId } = req.body;

  const sesClient = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    const student = await Student.findOne({ loginId: studentId });
    if (!student) {
      return res
        .status(400)
        .send({ error: "등록되지 않은 학생 아이디입니다." });
    }

    const resetToken = jwt.sign({ _id: student._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const resetLink = `${process.env.CLIENT_URL}/reset-student-password?token=${resetToken}`;

    const teacher = await Teacher.findOne({ _id: req.user._id }); // 교사 이메일로 발송
    if (!teacher) {
      return res.status(400).send({ error: "교사 정보를 찾을 수 없습니다." });
    }

    const params = {
      Source: process.env.AWS_SES_VERIFIED_EMAIL,
      Destination: {
        ToAddresses: [teacher.email],
      },
      Message: {
        Subject: {
          Data: "학생 비밀번호 재설정 요청",
        },
        Body: {
          Text: {
            Data: `안녕하세요, 아래 링크를 통해 학생의 비밀번호를 재설정하세요: ${resetLink}`,
          },
          Html: {
            Data: `<p>안녕하세요, 아래 링크를 통해 학생의 비밀번호를 재설정하세요:</p><a href="${resetLink}">${resetLink}</a>`,
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);

    res
      .status(200)
      .send({ message: "비밀번호 재설정 이메일이 발송되었습니다." });
  } catch (error) {
    console.error("학생 비밀번호 재설정 중 오류:", error);
    res.status(500).send({ error: "비밀번호 재설정 중 오류가 발생했습니다." });
  }
};

const resetStudentPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(decoded._id);

    if (!student) {
      return res.status(400).send({ error: "유효하지 않은 토큰입니다." });
    }

    student.password = password;
    await student.save();

    res.send({ message: "비밀번호가 성공적으로 재설정되었습니다." });
  } catch (error) {
    res.status(400).send({ error: "비밀번호 재설정에 실패했습니다." });
  }
};

module.exports = {
  googleLogin,
  completeRegistration,
  login,
  logout,
  refreshAccessToken,
  registerTeacher,
  registerStudent,
  registerAdmin,
  registerStudentByTeacher,
  forgotPassword,
  resetPassword,
  forgotStudentPassword,
  resetStudentPassword,
};
