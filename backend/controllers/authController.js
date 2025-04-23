const { OAuth2Client } = require("google-auth-library");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const redisClient = require("../utils/redisClient");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const { SendEmailCommand } = require("@aws-sdk/client-ses");
const sesClient = require("../utils/sesClient");
const logger = require("../utils/logger");

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

  const VALID_AUTH_CODE = process.env.TEACHER_AUTH_CODE;

  if (authCode !== VALID_AUTH_CODE) {
    logger.warn("Invalid teacher auth code during registration completion", {
      providedCode: authCode,
    });
    return res.status(400).send({ error: "Invalid authentication code" });
  }

  try {
    const teacher = new Teacher({ email, name, school });

    if (fcmToken) {
      teacher.tokens.push({ token: fcmToken });
    }

    await teacher.save();
    logger.info(`Teacher registration completed via Google: ${email}`);

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

    res.status(201).send({
      message: "Registration complete",
      accessToken,
      refreshToken,
      userId: teacher._id,
      role: teacher.role,
      school: teacher.school,
    });
  } catch (error) {
    logger.error("Failed to complete teacher registration", {
      error: error.message,
      stack: error.stack,
      email,
    });
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

  const VALID_AUTH_CODE = process.env.TEACHER_AUTH_CODE;

  if (authCode !== VALID_AUTH_CODE) {
    logger.warn("Invalid teacher auth code during manual registration", {
      providedCode: authCode,
    });
    return res.status(400).send({ error: "Invalid authentication code" });
  }

  try {
    const teacher = new Teacher({ email, password, name, school });
    await teacher.save();
    logger.info(`Teacher registered manually: ${email}`);
    res.status(201).send({
      _id: teacher._id,
      email: teacher.email,
      name: teacher.name,
      school: teacher.school,
      role: teacher.role,
    });
  } catch (error) {
    logger.error("Failed to register teacher manually", {
      error: error.message,
      stack: error.stack,
      email,
    });
    if (error.code === 11000) {
      return res.status(400).send({ error: "Email already exists." });
    }
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
    logger.info(`Student registered manually: ${loginId}`);
    res.status(201).send({
      _id: student._id,
      loginId: student.loginId,
      studentId: student.studentId,
      name: student.name,
      grade: student.grade,
      class: student.class,
      school: student.school,
      role: student.role,
    });
  } catch (error) {
    if (error.code === 11000) {
      logger.warn(
        `Failed to register student due to duplicate loginId: ${loginId}`,
        { error: error.message }
      );
      res.status(400).send({
        error: "사용 중인 로그인 ID입니다. 다른 식별코드를 사용하세요.",
        loginId: loginId,
      });
    } else {
      logger.error("Failed to create student manually", {
        error: error.message,
        stack: error.stack,
        loginId,
      });
      res.status(400).send({ error: "학생 계정 생성에 실패했습니다." });
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
  const teacherId = req.user._id; // 요청을 보낸 교사 ID
  logger.info(
    `Teacher ${teacherId} attempting to register ${
      students?.length || 0
    } students.`
  );

  // Ensure students is an array
  if (!Array.isArray(students)) {
    logger.warn(
      `Teacher ${teacherId} sent non-array data for student registration.`
    );
    return res
      .status(400)
      .send({ error: "학생 데이터는 배열 형태여야 합니다." });
  }

  for (const studentData of students) {
    // 필수 필드 검증 강화
    const requiredFields = [
      "loginId",
      "studentId",
      "name",
      "password",
      "grade",
      "studentClass",
      "school",
    ];
    const missingFields = requiredFields.filter(
      (field) => !(field in studentData) || !studentData[field]
    );

    if (missingFields.length > 0) {
      const errorMsg = `필수 필드가 누락되었습니다: ${missingFields.join(
        ", "
      )}`;
      logger.warn(
        `Missing fields for student registration by teacher ${teacherId}: ${errorMsg}`,
        { studentData }
      );
      results.failed.push({
        studentData, // 실패 시 원본 데이터 포함
        error: errorMsg,
      });
      continue; // 다음 학생으로 넘어감
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

      // Check if school matches the teacher's school (optional but recommended)
      // const teacher = await Teacher.findById(teacherId);
      // if (teacher && teacher.school !== school) {
      //   logger.warn(`Teacher ${teacherId} attempted to register student for different school: ${school}`);
      //   results.failed.push({ studentData, error: "다른 학교의 학생을 등록할 수 없습니다." });
      //   continue;
      // }

      const student = new Student({
        loginId,
        studentId,
        name,
        password,
        grade,
        class: studentClass,
        school,
      });
      const savedStudent = await student.save();
      logger.info(`Student ${loginId} registered by teacher ${teacherId}`);
      // 성공 결과에 민감 정보 제외하고 추가
      results.success.push({
        _id: savedStudent._id,
        loginId: savedStudent.loginId,
        name: savedStudent.name,
        school: savedStudent.school,
        grade: savedStudent.grade,
        class: savedStudent.class,
        studentId: savedStudent.studentId,
      });
    } catch (error) {
      if (error.code === 11000) {
        // Mongoose duplicate key error (loginId is the only unique index now)
        // const duplicateField = error.keyPattern.loginId ? "로그인 ID" : "학교의 학년, 반, 출석번호"; // 기존 로직
        logger.warn(
          `Failed to register student by teacher due to duplicate loginId: ${studentData.loginId}`,
          { error: error.message, teacherId }
        ); // 로거 수정
        results.failed.push({
          studentData, // 실패 시 원본 데이터 포함
          // error: `동일한 ${duplicateField}가 존재합니다. 식별코드를 변경하세요.`, // 기존 메시지
          error: "사용 중인 로그인 ID입니다. 다른 식별코드를 사용하세요.", // 수정된 메시지
        });
      } else {
        logger.error(`Failed to create student by teacher ${teacherId}`, {
          error: error.message,
          stack: error.stack,
          studentData,
        }); // 로거 사용
        results.failed.push({
          studentData, // 실패 시 원본 데이터 포함
          error: "학생 계정 생성 중 오류가 발생했습니다.", // 일반 에러 메시지 수정
        });
      }
    }
  }

  // Log summary
  logger.info(
    `Student registration batch by teacher ${teacherId} completed. Success: ${results.success.length}, Failed: ${results.failed.length}`
  );

  // Determine appropriate status code
  const statusCode =
    results.failed.length === 0 ? 201 : results.success.length > 0 ? 207 : 400;
  res.status(statusCode).send(results); // 201: Created, 207: Multi-Status, 400: Bad Request if all failed
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    logger.info(`Password reset request for teacher email: ${email}`);
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      logger.warn(
        `Password reset attempt for unregistered teacher email: ${email}`
      );
      return res
        .status(200)
        .send({ message: "비밀번호 재설정 이메일이 전송되었습니다." });
    }

    const resetToken = jwt.sign({ _id: teacher._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const params = {
      Source: process.env.AWS_SES_VERIFIED_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "비밀번호 재설정 요청" },
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

    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    logger.info(`Password reset email sent to teacher: ${email}`);

    res
      .status(200)
      .send({ message: "비밀번호 재설정 이메일이 전송되었습니다." });
  } catch (error) {
    logger.error("Error sending password reset email for teacher:", {
      error: error.message,
      stack: error.stack,
      email,
    });
    res.status(500).send({ error: "이메일 전송 중 오류가 발생했습니다." });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const teacher = await Teacher.findById(decoded._id);

    if (!teacher) {
      logger.warn("Password reset attempt with invalid token", { token });
      return res.status(400).send({ error: "유효하지 않은 토큰입니다." });
    }

    teacher.password = password;
    await teacher.save();
    logger.info(`Password reset successfully for teacher: ${teacher.email}`);

    res.send({ message: "비밀번호가 성공적으로 재설정되었습니다." });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      logger.warn("Password reset attempt with invalid or expired token", {
        token,
        error: error.message,
      });
      return res
        .status(400)
        .send({ error: "유효하지 않거나 만료된 토큰입니다." });
    }
    logger.error("Failed to reset teacher password", {
      error: error.message,
      stack: error.stack,
      token,
    });
    res.status(400).send({ error: "비밀번호 재설정에 실패했습니다." });
  }
};

const forgotStudentPassword = async (req, res) => {
  const { studentId } = req.body;

  try {
    logger.info(`Password reset request for student loginId: ${studentId}`);
    const student = await Student.findOne({ loginId: studentId });
    if (!student) {
      logger.warn(
        `Password reset attempt for unregistered student loginId: ${studentId}`
      );
      return res
        .status(200)
        .send({ message: "비밀번호 재설정 이메일이 발송되었습니다." });
    }

    const teacher = await Teacher.findById(req.user._id);
    if (!teacher) {
      logger.error(
        `Teacher not found for student password reset request. Teacher ID: ${req.user?._id}`
      );
      return res.status(400).send({ error: "교사 정보를 찾을 수 없습니다." });
    }

    const resetToken = jwt.sign({ _id: student._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const resetLink = `${process.env.CLIENT_URL}/reset-student-password?token=${resetToken}`;

    const params = {
      Source: process.env.AWS_SES_VERIFIED_EMAIL,
      Destination: { ToAddresses: [teacher.email] },
      Message: {
        Subject: { Data: `학생 비밀번호 재설정 요청 (${student.name})` },
        Body: {
          Text: {
            Data: `안녕하세요, ${student.name} 학생의 비밀번호 재설정 링크입니다: ${resetLink}`,
          },
          Html: {
            Data: `<p>안녕하세요, ${student.name} 학생의 비밀번호 재설정 링크입니다:</p><a href="${resetLink}">${resetLink}</a>`,
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    logger.info(
      `Student password reset email sent to teacher ${teacher.email} for student loginId: ${studentId}`
    );

    res
      .status(200)
      .send({ message: "비밀번호 재설정 이메일이 발송되었습니다." });
  } catch (error) {
    logger.error("Error sending student password reset email:", {
      error: error.message,
      stack: error.stack,
      studentLoginId: studentId,
      teacherId: req.user?._id,
    });
    res.status(500).send({ error: "비밀번호 재설정 중 오류가 발생했습니다." });
  }
};

const resetStudentPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(decoded._id);

    if (!student) {
      logger.warn("Student password reset attempt with invalid token", {
        token,
      });
      return res.status(400).send({ error: "유효하지 않은 토큰입니다." });
    }

    student.password = password;
    await student.save();
    logger.info(`Password reset successfully for student: ${student.loginId}`);

    res.send({ message: "비밀번호가 성공적으로 재설정되었습니다." });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      logger.warn(
        "Student password reset attempt with invalid or expired token",
        { token, error: error.message }
      );
      return res
        .status(400)
        .send({ error: "유효하지 않거나 만료된 토큰입니다." });
    }
    logger.error("Failed to reset student password", {
      error: error.message,
      stack: error.stack,
      token,
    });
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
