const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const { format } = require("date-fns");

const DAILY_LIMIT = 20;
const MONTHLY_LIMIT = 150;

const getStudents = async (req, res) => {
  const { school, grade, class: classNumber, uniqueIdentifier } = req.query;

  try {
    const students = await Student.find({
      school,
      grade,
      class: classNumber,
      loginId: { $regex: `^${uniqueIdentifier}` }, // loginId의 앞부분으로 필터링
    });
    res.status(200).send(students);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch students" });
  }
};

const getProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === "teacher") {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === "student") {
      user = await Student.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    res.send(user);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch profile" });
  }
};

const updateProfile = async (req, res) => {
  const updates = Object.keys(req.body);
  // const allowedUpdates = req.user.role === 'teacher' ? ['name', 'school', 'email'] : ['password'];
  // const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  // if (!isValidOperation) {
  //   console.warn('Invalid updates:', updates);
  //   return res.status(400).send({ error: 'Invalid updates!' });
  // }

  try {
    let user;
    if (req.user.role === "teacher") {
      user = await Teacher.findById(req.user._id);
    } else if (req.user.role === "student") {
      user = await Student.findById(req.user._id);
    }

    if (!user) {
      console.log("User not found:", req.user._id);
      return res.status(404).send();
    }

    // 이메일 중복 체크
    if (req.body.email) {
      const emailExists = await Teacher.findOne({ email: req.body.email });
      if (
        emailExists &&
        emailExists._id.toString() !== req.user._id.toString()
      ) {
        return res.status(400).send({ error: "Email already in use" });
      }
    }

    // 비밀번호 변경 요청인 경우
    if (req.user.role === "student") {
      const { currentPassword, password: newPassword } = req.body;

      // 현재 비밀번호 확인
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).send({ error: "Current password is incorrect" });
      }

      // 새 비밀번호로 설정
      user.password = newPassword;
    }

    updates.forEach((update) => {
      if (update !== "password") {
        user[update] = req.body[update];
      }
    });

    await user.save();
    res.send(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(400).send(error);
  }
};

const deleteProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === "teacher") {
      user = await Teacher.findByIdAndDelete(req.user._id);
    } else if (req.user.role === "student") {
      user = await Student.findByIdAndDelete(req.user._id);
    }

    if (!user) {
      return res.status(404).send();
    }

    res.send({ message: "User deleted" });
  } catch (error) {
    res.status(500).send(error);
  }
};

const getChatUsage = async (req, res) => {
  if (req.user.role !== "student") {
    return res
      .status(403)
      .send({ error: "Forbidden: Only students can access chat usage." });
  }

  try {
    const userId = req.user._id;
    const student = await Student.findById(userId);

    if (!student) {
      return res.status(404).send({ error: "Student not found" });
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const thisMonth = format(new Date(), "yyyy-MM");

    let { dailyChatCount, lastChatDay, monthlyChatCount, lastChatMonth } =
      student;
    let needsUpdate = false;
    const updateOps = { $set: {} };

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

    if (needsUpdate) {
      if (Object.keys(updateOps.$set).length > 0) {
        await Student.findByIdAndUpdate(userId, updateOps);
      }
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
    console.error("Error fetching chat usage:", error);
    res.status(500).send({ error: "Failed to fetch chat usage" });
  }
};

module.exports = {
  getStudents,
  getProfile,
  updateProfile,
  deleteProfile,
  getChatUsage,
};
