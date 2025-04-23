const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const { format } = require("date-fns");
const logger = require("../utils/logger");

const DAILY_LIMIT = 15;
const MONTHLY_LIMIT = 150;

// Helper function to extract school prefix (consistent with frontend logic)
const getSchoolPrefix = (schoolName) => {
  if (!schoolName) return "school"; // 기본값 혹은 에러 처리
  // "초등학교" 이전 부분 추출, 없으면 전체 이름 사용 (혹시 모를 다른 학교 유형 대비)
  const parts = schoolName.split("초등학교");
  return parts[0] || schoolName;
};

const getStudents = async (req, res) => {
  const { school, grade, class: classNumber, uniqueIdentifier } = req.query;
  const { _id: teacherId } = req.user; // 요청한 교사 ID (로깅용)

  try {
    // 유효성 검사
    if (
      !school ||
      !grade ||
      !classNumber ||
      uniqueIdentifier === undefined ||
      uniqueIdentifier === ""
    ) {
      // uniqueIdentifier 빈 값 체크 추가
      logger.warn(
        `getStudents called with missing or empty parameters by teacher ${teacherId}`,
        { query: req.query }
      );
      return res.status(400).send({
        error:
          "School, grade, class, and a non-empty unique identifier are required.",
      });
    }

    // 1. loginId prefix 생성 (frontend 로직과 일치시키기)
    const schoolPrefix = getSchoolPrefix(school);
    const expectedLoginIdPrefix = `${uniqueIdentifier}${schoolPrefix}${grade}${classNumber}`;
    logger.debug(
      `Constructed loginId prefix for search: ${expectedLoginIdPrefix}`
    ); // 디버그 로그 추가

    // 2. 복합 인덱스를 활용한 쿼리
    const students = await Student.find({
      school, // 인덱스 활용 1
      grade, // 인덱스 활용 2
      class: classNumber, // 인덱스 활용 3
      // loginId가 생성된 prefix로 시작하는지 검사 (인덱스 활용 4)
      loginId: { $regex: `^${expectedLoginIdPrefix}` },
    }).select("-password -tokens"); // 응답 시 민감 정보 제외

    // 학생 목록 정렬 (필요 시, 예: studentId 기준 오름차순)
    students.sort((a, b) => parseInt(a.studentId) - parseInt(b.studentId));

    res.status(200).send(students);
  } catch (error) {
    logger.error(`Error fetching students for teacher ${teacherId}:`, {
      query: req.query,
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .send({ error: "Failed to fetch students. Please try again later." });
  }
};

const getProfile = async (req, res) => {
  const { _id, role } = req.user;

  try {
    let user;
    if (role === "teacher") {
      user = await Teacher.findById(_id).select("-password -tokens"); // 민감 정보 제외하고 조회
    } else if (role === "student") {
      user = await Student.findById(_id).select("-password -tokens"); // 민감 정보 제외하고 조회
    } else {
      logger.warn(
        `getProfile attempt with invalid role: ${_id}, role: ${role}`
      );
      return res.status(403).send({ error: "Invalid user role" });
    }

    if (!user) {
      logger.warn(`User not found for getProfile: ${_id}, role: ${role}`);
      return res.status(404).send({ error: "User profile not found." }); // 표준화된 메시지
    }

    res.send(user);
  } catch (error) {
    logger.error(`Error fetching profile for user ${_id}:`, {
      error: error.message,
      stack: error.stack,
      role: role,
    });
    res
      .status(500)
      .send({ error: "Failed to fetch profile. Please try again later." }); // 표준화된 메시지
  }
};

const updateProfile = async (req, res) => {
  const { _id, role } = req.user; // 인증된 사용자 정보
  const updates = req.body;

  try {
    let user;
    let Model;

    // 1. 사용자 역할에 따라 모델 선택 및 사용자 조회
    if (role === "teacher") {
      Model = Teacher;
      user = await Model.findById(_id);
    } else if (role === "student") {
      Model = Student;
      user = await Model.findById(_id);
    } else {
      logger.warn(
        `updateProfile attempt with invalid role: ${_id}, role: ${role}`
      );
      return res.status(403).send({ error: "Invalid user role" });
    }

    if (!user) {
      logger.warn(`User not found for update: ${_id}, role: ${role}`);
      return res.status(404).send({ error: "User not found." }); // 표준화된 메시지
    }

    // 2. 역할별 업데이트 처리
    if (role === "teacher") {
      // 교사 업데이트 가능 필드: name, school, email, password(조건부)
      if (updates.name !== undefined) user.name = updates.name.trim(); // 공백 제거 추가
      if (updates.school !== undefined) user.school = updates.school.trim(); // 공백 제거 추가

      // 이메일 업데이트 (중복 체크 포함)
      if (updates.email !== undefined && updates.email.trim() !== user.email) {
        const trimmedEmail = updates.email.trim();
        // 이메일 형식 유효성 검사 (간단하게)
        if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
          return res.status(400).send({ error: "Invalid email format." });
        }
        const emailExists = await Teacher.findOne({ email: trimmedEmail });
        if (emailExists && emailExists._id.toString() !== _id.toString()) {
          logger.warn(
            `Email update conflict for teacher ${_id}: email ${trimmedEmail} already exists.`
          );
          return res.status(400).send({
            error: "This email address is already in use by another account.",
          }); // 표준화된 메시지
        }
        user.email = trimmedEmail;
      }

      // 비밀번호 업데이트 (OAuth 가입자는 비밀번호 필드가 없을 수 있음)
      if (user.password && updates.currentPassword && updates.password) {
        const isMatch = await bcrypt.compare(
          updates.currentPassword,
          user.password
        );
        if (!isMatch) {
          logger.warn(`Incorrect current password attempt for teacher ${_id}.`);
          return res
            .status(401)
            .send({ error: "The current password you entered is incorrect." }); // 표준화된 메시지
        }
        // 새 비밀번호 길이 등 유효성 검사 추가 가능
        if (updates.password.length < 6) {
          // 예시: 최소 6자리
          return res.status(400).send({
            error: "New password must be at least 6 characters long.",
          });
        }
        user.password = updates.password; // pre-save 훅에서 해싱됨
      } else if (
        (updates.currentPassword || updates.password) &&
        !user.password
      ) {
        logger.warn(`Password change attempt for OAuth teacher ${_id}.`);
        return res.status(400).send({
          error:
            "Password management is not available for accounts registered via social login.",
        }); // 표준화된 메시지
      } else if (updates.currentPassword && !updates.password) {
        return res
          .status(400)
          .send({ error: "Please enter the new password." }); // 표준화된 메시지
      } else if (
        !updates.currentPassword &&
        updates.password &&
        user.password
      ) {
        // user.password 조건 추가
        return res.status(400).send({
          error: "Please enter your current password to set a new one.",
        }); // 표준화된 메시지
      }
    } else if (role === "student") {
      // 학생 업데이트 가능 필드: password 만
      const allowedUpdates = ["currentPassword", "password"];
      const receivedUpdates = Object.keys(updates);
      const isInvalidUpdateAttempt = receivedUpdates.some(
        (key) => !allowedUpdates.includes(key)
      );

      if (isInvalidUpdateAttempt) {
        logger.warn(
          `Invalid field update attempt for student ${_id}: ${receivedUpdates.join(
            ", "
          )}`
        );
        return res.status(400).send({
          error: "Only password can be updated for student accounts.",
        }); // 표준화된 메시지
      }

      if (updates.currentPassword && updates.password) {
        const isMatch = await bcrypt.compare(
          updates.currentPassword,
          user.password
        );
        if (!isMatch) {
          logger.warn(`Incorrect current password attempt for student ${_id}.`);
          return res
            .status(401)
            .send({ error: "The current password you entered is incorrect." }); // 표준화된 메시지
        }
        if (updates.password.length < 3) {
          // 예시: 학생은 3자리 (요구사항 맞게 수정)
          return res.status(400).send({
            error: "New password must be at least 3 characters long.",
          });
        }
        user.password = updates.password; // pre-save 훅에서 해싱됨
      } else if (receivedUpdates.length > 0) {
        // 업데이트 시도 필드가 있으나 current/new가 모두 없는 경우
        return res.status(400).send({
          error:
            "Both current and new passwords are required to change the password.",
        }); // 표준화된 메시지
      } else if (receivedUpdates.length === 0) {
        // 업데이트할 내용이 없을 때 (정상 처리 혹은 에러 처리 선택 가능 - 여기서는 에러 처리)
        return res
          .status(400)
          .send({ error: "No update information provided." });
      }
    }

    // 3. 변경사항 저장
    await user.save();
    logger.info(`Profile updated successfully for user ${_id}, role: ${role}`);

    // 4. 응답 전송 (민감 정보 제외)
    const userObject = user.toObject();
    delete userObject.password;
    delete userObject.tokens;

    res.send(userObject);
  } catch (error) {
    logger.error(`Error updating profile for user ${_id}:`, {
      error: error.message,
      stack: error.stack,
      role: role,
      updates: Object.keys(updates),
    });
    res
      .status(500)
      .send({ error: "Failed to update profile. Please try again later." }); // 표준화된 메시지
  }
};

const deleteProfile = async (req, res) => {
  const { _id, role } = req.user;

  try {
    let user;
    if (role === "teacher") {
      user = await Teacher.findByIdAndDelete(_id);
    } else if (role === "student") {
      user = await Student.findByIdAndDelete(_id);
    } else {
      logger.warn(
        `deleteProfile attempt with invalid role: ${_id}, role: ${role}`
      );
      return res.status(403).send({ error: "Invalid user role" });
    }

    if (!user) {
      logger.warn(`User not found for deletion: ${_id}, role: ${role}`);
      // 404 Not Found 반환 및 표준 에러 메시지 사용
      return res.status(404).send({ error: "User account not found." });
    }

    logger.info(`User account deleted successfully: ${_id}, role: ${role}`);
    // 성공 메시지를 JSON 형식으로 통일
    res.send({ message: "Your account has been successfully deleted." });
  } catch (error) {
    logger.error(`Error deleting profile for user ${_id}:`, {
      error: error.message,
      stack: error.stack,
      role: role,
    });
    // 500 Internal Server Error 반환 및 표준 에러 메시지 사용
    res
      .status(500)
      .send({ error: "Failed to delete account. Please try again later." });
  }
};

const getChatUsage = async (req, res) => {
  const { _id, role } = req.user;

  if (role !== "student") {
    logger.warn(
      `Chat usage access attempt by non-student: ${_id}, role: ${role}`
    );
    return res
      .status(403)
      .send({ error: "Forbidden: Only students can access chat usage." });
  }

  try {
    const student = await Student.findById(_id);

    if (!student) {
      logger.warn(`Student not found for getChatUsage: ${_id}`);
      return res.status(404).send({ error: "Student profile not found." }); // 표준화된 메시지
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const thisMonth = format(new Date(), "yyyy-MM");

    let { dailyChatCount, lastChatDay, monthlyChatCount, lastChatMonth } =
      student;
    let needsUpdate = false;
    const updateOps = { $set: {} };

    // 날짜/월 변경 시 카운트 초기화 로직 (기존 유지)
    if (lastChatDay !== today) {
      dailyChatCount = 0;
      updateOps.$set.dailyChatCount = 0;
      updateOps.$set.lastChatDay = today;
      needsUpdate = true;
    }
    if (lastChatMonth !== thisMonth) {
      monthlyChatCount = 0;
      updateOps.$set.monthlyChatCount = 0;
      updateOps.$set.lastChatMonth = thisMonth;
      needsUpdate = true;
    }

    // DB 업데이트 (필요 시에만)
    if (needsUpdate && Object.keys(updateOps.$set).length > 0) {
      await Student.findByIdAndUpdate(_id, updateOps);
      logger.info(
        `Chat counts reset for student ${_id} - Day: ${
          lastChatDay !== today
        }, Month: ${lastChatMonth !== thisMonth}`
      );
    }

    const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyChatCount);
    const monthlyRemaining = Math.max(0, MONTHLY_LIMIT - monthlyChatCount);

    res.send({
      dailyLimit: DAILY_LIMIT,
      monthlyLimit: MONTHLY_LIMIT,
      dailyCount: dailyChatCount,
      monthlyCount: monthlyChatCount,
      dailyRemaining,
      monthlyRemaining,
    });
  } catch (error) {
    // console.error 대신 logger 사용
    logger.error(`Error fetching chat usage for student ${_id}:`, {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .send({ error: "Failed to fetch chat usage. Please try again later." }); // 표준화된 메시지
  }
};

module.exports = {
  getStudents,
  getProfile,
  updateProfile,
  deleteProfile,
  getChatUsage,
};
