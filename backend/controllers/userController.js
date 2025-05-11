const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const { format } = require("date-fns");
const logger = require("../utils/logger");
const config = require("../config"); // 설정 파일 로드
const chatUsageService = require("../services/chatUsageService"); // chatUsageService 임포트

const { DAILY_LIMIT, MONTHLY_LIMIT } = config.chatLimits; // 설정값 사용

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
        error: "학교, 학년, 반, 식별코드는 필수 항목입니다.",
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
    res.status(500).send({
      error: "학생 정보를 불러오는데 실패했습니다. 나중에 다시 시도해주세요.",
    });
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
      return res.status(403).send({ error: "잘못된 사용자 역할입니다." });
    }

    if (!user) {
      logger.warn(`User not found for getProfile: ${_id}, role: ${role}`);
      return res
        .status(404)
        .send({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    res.send(user);
  } catch (error) {
    logger.error(`Error fetching profile for user ${_id}:`, {
      error: error.message,
      stack: error.stack,
      role: role,
    });
    res.status(500).send({
      error: "프로필 정보를 불러오는데 실패했습니다. 나중에 다시 시도해주세요.",
    });
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
      return res.status(403).send({ error: "잘못된 사용자 역할입니다." });
    }

    if (!user) {
      logger.warn(`User not found for update: ${_id}, role: ${role}`);
      return res.status(404).send({ error: "사용자를 찾을 수 없습니다." });
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
          return res
            .status(400)
            .send({ error: "유효하지 않은 이메일 형식입니다." });
        }
        const emailExists = await Teacher.findOne({ email: trimmedEmail });
        if (emailExists && emailExists._id.toString() !== _id.toString()) {
          logger.warn(
            `Email update conflict for teacher ${_id}: email ${trimmedEmail} already exists.`
          );
          return res.status(400).send({
            error: "이미 사용 중인 이메일 주소입니다.",
          });
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
            .send({ error: "현재 비밀번호가 올바르지 않습니다." });
        }
        // 새 비밀번호 길이 등 유효성 검사 추가 가능
        if (updates.password.length < 6) {
          return res.status(400).send({
            error: "새 비밀번호는 최소 6자 이상이어야 합니다.",
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
            "소셜 로그인을 통해 가입한 계정은 비밀번호를 관리할 수 없습니다.",
        });
      } else if (updates.currentPassword && !updates.password) {
        return res.status(400).send({ error: "새 비밀번호를 입력해주세요." });
      } else if (
        !updates.currentPassword &&
        updates.password &&
        user.password
      ) {
        // user.password 조건 추가
        return res.status(400).send({
          error: "새 비밀번호를 설정하려면 현재 비밀번호를 입력해주세요.",
        });
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
          error: "학생 계정은 비밀번호만 수정할 수 있습니다.",
        });
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
            .send({ error: "현재 비밀번호가 올바르지 않습니다." });
        }
        if (updates.password.length < 3) {
          // 예시: 학생은 3자리 (요구사항 맞게 수정)
          return res.status(400).send({
            error: "새 비밀번호는 최소 3자 이상이어야 합니다.",
          });
        }
        user.password = updates.password; // pre-save 훅에서 해싱됨
      } else if (receivedUpdates.length > 0) {
        // 업데이트 시도 필드가 있으나 current/new가 모두 없는 경우
        return res.status(400).send({
          error:
            "비밀번호를 변경하려면 현재 비밀번호와 새 비밀번호를 모두 입력해야 합니다.",
        });
      } else if (receivedUpdates.length === 0) {
        // 업데이트할 내용이 없을 때 (정상 처리 혹은 에러 처리 선택 가능 - 여기서는 에러 처리)
        return res
          .status(400)
          .send({ error: "업데이트할 정보가 제공되지 않았습니다." });
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
    res.status(500).send({
      error: "프로필 업데이트에 실패했습니다. 나중에 다시 시도해주세요.",
    });
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
      return res.status(403).send({ error: "잘못된 사용자 역할입니다." });
    }

    if (!user) {
      logger.warn(`User not found for deletion: ${_id}, role: ${role}`);
      // 404 Not Found 반환 및 표준 에러 메시지 사용
      return res.status(404).send({ error: "사용자 계정을 찾을 수 없습니다." });
    }

    logger.info(`User account deleted successfully: ${_id}, role: ${role}`);
    // 성공 메시지를 JSON 형식으로 통일
    res.send({ message: "계정이 성공적으로 삭제되었습니다." });
  } catch (error) {
    logger.error(`Error deleting profile for user ${_id}:`, {
      error: error.message,
      stack: error.stack,
      role: role,
    });
    // 500 Internal Server Error 반환 및 표준 에러 메시지 사용
    res
      .status(500)
      .send({ error: "계정 삭제에 실패했습니다. 나중에 다시 시도해주세요." });
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
      .send({ error: "접근 금지: 학생만 채팅 사용량에 접근할 수 있습니다." });
  }

  try {
    // chatUsageService를 사용하여 사용량 확인 및 필요한 경우 DB 업데이트
    const usageInfo = await chatUsageService.checkAndUpdateUsageOnInit(_id);

    if (usageInfo.errorType === "user_not_found") {
      logger.warn(
        `[UserController] Student not found for getChatUsage: ${_id}`
      );
      return res.status(404).send({ error: "학생 프로필을 찾을 수 없습니다." });
    }
    if (
      usageInfo.errorType &&
      usageInfo.errorType !== "daily_limit_exceeded" &&
      usageInfo.errorType !== "monthly_limit_exceeded"
    ) {
      // "daily_limit_exceeded" 또는 "monthly_limit_exceeded"는 사용량 표시를 위해 정상 처리
      // 그 외 서비스 내부 오류 (예: usage_check_error) 는 에러로 간주
      logger.error(
        `[UserController] Error from chatUsageService for student ${_id}: ${usageInfo.errorType}`
      );
      return res.status(500).send({
        error: "채팅 사용량을 불러오는데 실패했습니다. (서비스 오류)",
      });
    }

    // 서비스에서 반환된 최신 dailyCount와 monthlyCount 사용
    const displayDailyCount = usageInfo.dailyCount;
    const displayMonthlyCount = usageInfo.monthlyCount;

    // 남은 횟수 계산
    const dailyRemaining = Math.max(0, DAILY_LIMIT - displayDailyCount);
    const monthlyRemaining = Math.max(0, MONTHLY_LIMIT - displayMonthlyCount);

    // 응답 전송
    res.send({
      dailyLimit: DAILY_LIMIT,
      monthlyLimit: MONTHLY_LIMIT,
      dailyCount: displayDailyCount,
      monthlyCount: displayMonthlyCount,
      dailyRemaining,
      monthlyRemaining,
    });
  } catch (error) {
    // chatUsageService.checkAndUpdateUsageOnInit 내부에서 발생할 수 있는 예외 처리
    logger.error(
      `[UserController] Error fetching chat usage for student ${_id}:`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    res.status(500).send({
      error: "채팅 사용량을 불러오는데 실패했습니다. 나중에 다시 시도해주세요.",
    });
  }
};

// --- 새로운 컨트롤러 함수들 추가 ---

// 학생 ID로 학생 정보 조회 (교사용)
const getStudentByLoginId = async (req, res) => {
  const { loginId } = req.query;
  const { _id: teacherId } = req.user; // 요청 교사 ID (로깅 및 권한 확인용)

  try {
    if (!loginId) {
      return res.status(400).send({ error: "학생 아이디를 입력해주세요." });
    }

    const student = await Student.findOne({ loginId }).select(
      "-password -tokens"
    ); // 비밀번호, 토큰 제외

    if (!student) {
      logger.warn(
        `Student not found by loginId ${loginId} (requested by teacher ${teacherId})`
      );
      return res
        .status(404)
        .send({ error: "해당 아이디의 학생을 찾을 수 없습니다." });
    }

    // 추가 권한 확인: 이 교사가 이 학생을 관리할 권한이 있는가?
    // 예를 들어, 같은 학교 소속인지 확인 등 (현재는 교사 역할만 확인됨)
    // const teacher = await Teacher.findById(teacherId);
    // if (teacher && teacher.school !== student.school) {
    //   logger.warn(`Teacher ${teacherId} attempted to access student ${loginId} from different school.`);
    //   return res.status(403).send({ error: "접근 권한이 없습니다." });
    // }

    res.send(student);
  } catch (error) {
    logger.error(
      `Error fetching student by loginId ${loginId} (requested by teacher ${teacherId}):`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    res.status(500).send({ error: "학생 정보 조회 중 오류가 발생했습니다." });
  }
};

// 학생 정보 수정 (교사용)
const updateStudentByTeacher = async (req, res) => {
  const { studentId: targetStudentObjectId } = req.params; // URL 파라미터는 학생의 ObjectId (_id)
  const updates = req.body; // 수정할 정보 { name: "...", studentId: "..." }
  const { _id: teacherId } = req.user;

  // 교사가 수정할 수 있는 필드 제한 (name, studentId)
  const allowedUpdates = ["name", "studentId"];
  const receivedUpdates = Object.keys(updates);
  const isValidOperation =
    receivedUpdates.every((key) => allowedUpdates.includes(key)) &&
    receivedUpdates.length > 0;

  if (!isValidOperation) {
    logger.warn(
      `Invalid or empty field update attempt by teacher ${teacherId} for student ObjectId ${targetStudentObjectId}: ${receivedUpdates.join(
        ", "
      )}`
    );
    return res
      .status(400)
      .send({ error: "이름 또는 학생 번호만 수정할 수 있습니다." });
  }

  try {
    const student = await Student.findById(targetStudentObjectId);

    if (!student) {
      logger.warn(
        `Student not found for update by teacher ${teacherId}: ObjectId ${targetStudentObjectId}`
      );
      return res.status(404).send({ error: "수정할 학생을 찾을 수 없습니다." });
    }

    // --- 권한 확인 로직 (예: 같은 학교 소속인지) 추가 가능 ---
    // const teacher = await Teacher.findById(teacherId);
    // if (teacher && teacher.school !== student.school) { ... }

    let newLoginId = student.loginId; // 기본값은 기존 아이디
    let loginIdChanged = false;

    // 1. 이름 업데이트 처리 (수정 요청이 있을 경우)
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        return res
          .status(400)
          .send({ error: "학생 이름은 비워둘 수 없습니다." });
      }
      if (student.name !== trimmedName) {
        student.name = trimmedName;
      }
    }

    // 2. 학생 번호(studentId) 업데이트 처리 (수정 요청이 있을 경우)
    if (updates.studentId !== undefined) {
      const newStudentIdStr = updates.studentId.trim();
      // 숫자 형식 및 범위 검증 (1 이상)
      if (!/^\d+$/.test(newStudentIdStr) || parseInt(newStudentIdStr, 10) < 1) {
        return res
          .status(400)
          .send({ error: "학생 번호는 1 이상의 숫자여야 합니다." });
      }
      // 기존 번호와 다른 경우에만 업데이트 및 loginId 재생성/검증 수행
      if (student.studentId !== newStudentIdStr) {
        const newStudentIdNum = parseInt(newStudentIdStr, 10);

        // loginId 재생성
        const paddedNewStudentId = newStudentIdStr.padStart(2, "0"); // 0 채우기 적용!
        // 기존 loginId에서 prefix 추출 (마지막 두자리 숫자 제외)
        const currentLoginIdPrefix = student.loginId.slice(0, -2);

        // --- loginId prefix 검증 (선택적이지만 권장) ---
        // 예: prefix가 비어있거나 예상 형식과 다르면 에러 처리
        if (!currentLoginIdPrefix) {
          logger.error(
            `Failed to extract loginId prefix for student ${student.loginId} (ObjectId: ${targetStudentObjectId})`
          );
          return res.status(500).send({ error: "로그인 ID 구성 중 오류 발생" });
        }
        // --- 검증 끝 ---

        newLoginId = `${currentLoginIdPrefix}${paddedNewStudentId}`;
        loginIdChanged = true;

        // 3. 새로운 loginId 고유성 검증 (자기 자신 제외)
        const existingStudentWithNewLoginId = await Student.findOne({
          loginId: newLoginId,
          _id: { $ne: targetStudentObjectId }, // 현재 수정 중인 학생 제외
        });

        if (existingStudentWithNewLoginId) {
          logger.warn(
            `LoginId conflict during update: new loginId ${newLoginId} already exists. Requested by teacher ${teacherId} for student ObjectId ${targetStudentObjectId}`
          );
          return res.status(400).send({
            error:
              "해당 정보로 조합된 아이디가 이미 존재합니다. (번호 등 확인 필요)",
          });
        }

        // 고유성 검증 통과 시 student 모델 업데이트 준비
        student.studentId = newStudentIdStr; // studentId 업데이트
        student.loginId = newLoginId; // loginId 업데이트
      }
    }

    // 4. 변경사항 저장 (변경된 경우에만)
    // isModified()를 사용하거나, 업데이트 플래그를 만들어 처리 가능
    if (student.isModified("name") || loginIdChanged) {
      await student.save();
      logger.info(
        `Student ${targetStudentObjectId} profile updated by teacher ${teacherId}. LoginId changed: ${loginIdChanged}`
      );
    } else {
      logger.info(
        `No actual changes detected for student ${targetStudentObjectId} update requested by teacher ${teacherId}.`
      );
      // 변경사항이 없다는 메시지를 보내거나, 그냥 성공 처리할 수 있음
      // return res.status(200).send({ message: "변경사항이 없어 업데이트하지 않았습니다." });
    }

    const updatedStudentObject = student.toObject();
    delete updatedStudentObject.password;
    delete updatedStudentObject.tokens;
    res.send(updatedStudentObject); // 업데이트된 (또는 변경 없는) 학생 정보 반환
  } catch (error) {
    logger.error(
      `Error updating student ${targetStudentObjectId} by teacher ${teacherId}:`,
      {
        error: error.message,
        stack: error.stack,
        updates: receivedUpdates,
      }
    );
    res.status(500).send({ error: "학생 정보 수정 중 오류가 발생했습니다." });
  }
};

// 학생 비밀번호 초기화 (교사용)
const resetStudentPasswordByTeacher = async (req, res) => {
  const { studentId } = req.params; // 학생의 ObjectId (_id)
  const { _id: teacherId } = req.user;
  const defaultPassword = "123"; // 초기 비밀번호

  try {
    const student = await Student.findById(studentId);

    if (!student) {
      logger.warn(
        `Student not found for password reset by teacher ${teacherId}: ${studentId}`
      );
      return res
        .status(404)
        .send({ error: "비밀번호를 초기화할 학생을 찾을 수 없습니다." });
    }

    // 추가 권한 확인 (필요 시)

    student.password = defaultPassword; // pre-save 훅에서 해싱됨
    await student.save();
    logger.info(
      `Student ${studentId} password reset to default by teacher ${teacherId}`
    );

    res.send({ message: '학생 비밀번호가 "123"으로 초기화되었습니다.' });
  } catch (error) {
    logger.error(
      `Error resetting student ${studentId} password by teacher ${teacherId}:`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    res.status(500).send({ error: "비밀번호 초기화 중 오류가 발생했습니다." });
  }
};

// 학생 계정 삭제 (교사용)
const deleteStudentByTeacher = async (req, res) => {
  const { studentId } = req.params; // 학생의 ObjectId (_id)
  const { _id: teacherId } = req.user;

  try {
    const student = await Student.findByIdAndDelete(studentId);

    if (!student) {
      logger.warn(
        `Student not found for deletion by teacher ${teacherId}: ${studentId}`
      );
      return res
        .status(404)
        .send({ error: "삭제할 학생 계정을 찾을 수 없습니다." });
    }

    // 추가 권한 확인 (필요 시)

    logger.info(`Student account ${studentId} deleted by teacher ${teacherId}`);
    res.send({ message: "학생 계정이 성공적으로 삭제되었습니다." });
  } catch (error) {
    logger.error(
      `Error deleting student ${studentId} by teacher ${teacherId}:`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    res.status(500).send({ error: "학생 계정 삭제 중 오류가 발생했습니다." });
  }
};

// --- 추가 끝 ---

module.exports = {
  getStudents,
  getProfile,
  updateProfile,
  deleteProfile,
  getChatUsage,
  // --- 새 컨트롤러 함수 export ---
  getStudentByLoginId,
  updateStudentByTeacher,
  resetStudentPasswordByTeacher,
  deleteStudentByTeacher,
};
