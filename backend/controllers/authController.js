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
    return res.status(400).send({ error: "유효하지 않은 인증 코드입니다" });
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
    return res.status(400).send({ error: "인증 코드가 올바르지 않습니다." });
  }

  if (!password || password.length < 6) {
    logger.warn(
      `Attempt to register teacher ${email} with password shorter than 6 characters.`
    );
    return res
      .status(400)
      .send({ error: "비밀번호는 최소 6자 이상이어야 합니다." });
  }

  try {
    const teacher = new Teacher({ email, password, name, school });
    await teacher.save();
    logger.info(`Teacher registered manually: ${email}`);

    // --- 회원가입 성공 후 바로 로그인 처리 로직 추가 ---
    // 1. 토큰 생성
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

    // 2. Redis에 리프레시 토큰 저장
    try {
      await redisClient.set(
        teacher._id.toString(),
        refreshToken,
        "EX",
        7 * 24 * 60 * 60 // 7일 (초 단위)
      );
      logger.info(
        `Refresh token stored in Redis for new teacher ${teacher.email}`
      );
    } catch (redisError) {
      logger.error(
        `Failed to save refresh token to Redis for new teacher ${teacher.email}:`,
        redisError
      );
      // Redis 저장 실패가 회원가입 자체를 중단시킬지는 정책에 따라 결정
      // 여기서는 로깅만 하고 진행
    }

    // 3. 응답 데이터에 토큰 및 사용자 정보 포함하여 전송
    res.status(201).send({
      message: "회원가입 및 로그인이 완료되었습니다.", // 메시지 변경
      accessToken,
      refreshToken,
      userId: teacher._id,
      role: teacher.role,
      school: teacher.school,
      // name: teacher.name, // 필요 시 이름도 포함 가능
    });
    // --- 로그인 처리 로직 끝 ---
  } catch (error) {
    logger.error("Failed to register teacher manually", {
      error: error.message,
      stack: error.stack,
      email,
    });
    if (error.code === 11000) {
      return res.status(400).send({ error: "이미 사용 중인 이메일입니다." });
    }
    res.status(400).send({ error: "교사 계정 생성에 실패했습니다." });
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
  const studentsData = req.body;
  const teacherId = req.user._id;
  logger.info(
    `Teacher ${teacherId} attempting to register ${
      studentsData?.length || 0
    } students.`
  );

  const results = {
    success: [],
    failed: [],
  };

  if (!Array.isArray(studentsData) || studentsData.length === 0) {
    logger.warn(
      `Teacher ${teacherId} sent non-array or empty data for student registration.`
    );
    return res.status(400).send({
      error: "학생 데이터는 배열 형태여야 하며 비어있지 않아야 합니다.",
    });
  }

  // 삽입할 학생 데이터와 원본 데이터 매핑 준비 (실패 시 원본 데이터 반환용)
  const studentsToInsert = [];
  const loginIdToOriginalDataMap = new Map();
  const loginIdSet = new Set(); // 배치 내 중복 loginId 검사

  // 1. 데이터 유효성 검사 및 삽입 데이터 준비
  for (const studentData of studentsData) {
    // 원본 데이터를 Map에 저장
    loginIdToOriginalDataMap.set(studentData.loginId, studentData);

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
      logger.warn(`Missing fields by teacher ${teacherId}: ${errorMsg}`, {
        studentData,
      });
      results.failed.push({ studentData, error: errorMsg });
      continue;
    }

    if (loginIdSet.has(studentData.loginId)) {
      const errorMsg = `제출된 데이터 내에 동일한 로그인 ID(${studentData.loginId})가 존재합니다.`;
      logger.warn(
        `Duplicate loginId within batch by teacher ${teacherId}: ${studentData.loginId}`
      );
      results.failed.push({ studentData, error: errorMsg });
      continue;
    }
    loginIdSet.add(studentData.loginId);

    try {
      const hashedPassword = await bcrypt.hash(studentData.password, 12);
      studentsToInsert.push({
        loginId: studentData.loginId,
        studentId: studentData.studentId,
        name: studentData.name,
        password: hashedPassword,
        grade: studentData.grade,
        class: studentData.studentClass,
        school: studentData.school,
      });
    } catch (hashError) {
      logger.error(
        `Password hashing failed for ${studentData.loginId} by ${teacherId}`,
        { error: hashError }
      );
      results.failed.push({ studentData, error: "비밀번호 처리 중 오류 발생" });
      continue;
    }
  }

  // 2. 실제 데이터베이스 삽입 시도
  if (studentsToInsert.length > 0) {
    const insertedLoginIds = new Set(); // 성공적으로 삽입된 loginId 추적
    const failedDueToDbError = new Set(); // DB 오류로 실패한 loginId 추적

    try {
      // insertMany 실행. ordered: false 설정
      await Student.insertMany(studentsToInsert, { ordered: false });

      // 오류가 발생하지 않았다면 모든 studentsToInsert가 성공
      studentsToInsert.forEach((student) =>
        insertedLoginIds.add(student.loginId)
      );
    } catch (error) {
      logger.error(`Error during insertMany by teacher ${teacherId}:`, {
        error: error.message,
        writeErrors: error.writeErrors,
      });

      const writeErrors = error.writeErrors || error.errors || [];

      // 실패한 학생들을 failed 목록에 추가
      writeErrors.forEach((writeError) => {
        // writeError.err.op 또는 writeError.op (Mongoose 버전에 따라 다름) 에서 실패한 문서 정보 가져오기
        const failedOp = writeError.err?.op || writeError.op;
        if (failedOp && failedOp.loginId) {
          const originalData = loginIdToOriginalDataMap.get(failedOp.loginId);
          let errorMessage = "DB 오류로 생성 실패";
          if (writeError.err?.code === 11000 || writeError.code === 11000) {
            errorMessage =
              "사용 중인 로그인 ID입니다. 다른 식별코드를 사용하세요.";
          }
          // 이미 다른 이유로 실패 처리되지 않은 경우에만 추가
          if (
            !results.failed.some(
              (f) => f.studentData.loginId === failedOp.loginId
            )
          ) {
            results.failed.push({
              studentData: originalData,
              error: errorMessage,
            });
          }
          failedDueToDbError.add(failedOp.loginId); // DB 오류로 실패했음을 표시
        }
      });

      // 삽입 시도했던 학생 중 DB 오류로 실패하지 않은 학생은 성공한 것으로 간주
      studentsToInsert.forEach((student) => {
        if (!failedDueToDbError.has(student.loginId)) {
          insertedLoginIds.add(student.loginId);
        }
      });
    }

    // 3. 성공한 학생들의 전체 정보(_id 포함) 다시 조회
    if (insertedLoginIds.size > 0) {
      try {
        const successfullyInsertedStudents = await Student.find({
          loginId: { $in: Array.from(insertedLoginIds) },
        }).select("_id loginId name school grade class studentId"); // 필요한 필드만 선택

        results.success = successfullyInsertedStudents.map((s) => s.toObject()); // 결과를 success 배열에 추가
        logger.info(
          `Fetched details for ${results.success.length} successfully inserted students by teacher ${teacherId}.`
        );
      } catch (fetchError) {
        logger.error(
          `Failed to fetch details of successfully inserted students by teacher ${teacherId}`,
          { error: fetchError }
        );
        // 성공했지만 정보 조회를 실패한 경우, loginId만 가진 정보라도 반환할지 결정 필요
        // 여기서는 일단 success 배열을 비워두거나, 최소한의 정보만 넣을 수 있음
        insertedLoginIds.forEach((loginId) => {
          if (!results.failed.some((f) => f.studentData.loginId === loginId)) {
            // _id 없이 삽입 시도했던 데이터라도 넣어주기 (프론트엔드와 협의 필요)
            // results.success.push(loginIdToOriginalDataMap.get(loginId));
            // 또는 에러 메시지와 함께 실패 처리
            results.failed.push({
              studentData: loginIdToOriginalDataMap.get(loginId),
              error: "계정은 생성되었으나 정보 조회 실패",
            });
          }
        });
      }
    }
  }

  // 최종 결과 로그 및 응답
  logger.info(
    `Student registration batch by teacher ${teacherId} completed. Success: ${results.success.length}, Failed: ${results.failed.length}`
  );

  const statusCode =
    results.failed.length === 0 ? 201 : results.success.length > 0 ? 207 : 400;
  res.status(statusCode).send(results);
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

    if (!password || password.length < 6) {
      logger.warn(
        `Attempt to reset password with length < 6 for teacher ${teacher.email}`
      );
      return res
        .status(400)
        .send({ error: "새 비밀번호는 최소 6자 이상이어야 합니다." });
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

    if (!password || password.length < 3) {
      logger.warn(
        `Attempt to reset password with length < 3 for student ${student.loginId}`
      );
      return res
        .status(400)
        .send({ error: "새 비밀번호는 최소 3자 이상이어야 합니다." });
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
