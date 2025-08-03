const Student = require("../models/Student");
const Teacher = require("../models/Teacher");

const getStudents = async (req, res) => {
  try {
    // --- 🔽 추가: 페이지네이션 파라미터 파싱 ---
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "50", 10);
    const skip = (page - 1) * limit;

    // --- 🔽 수정: 민감-필드 제외 + 페이지네이션 ---
    const [students, total] = await Promise.all([
      Student.find({}, "-password -tokens -__v") // 필요 없는 필드 제외
        .skip(skip)
        .limit(limit),
      Student.countDocuments(),
    ]);

    res.status(200).send({
      students,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).send({ error: "학생 정보를 불러오는데 실패했습니다." });
  }
};

const getTeachers = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "50", 10);
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      Teacher.find({}, "-password -tokens -__v").skip(skip).limit(limit),
      Teacher.countDocuments(),
    ]);

    res.status(200).send({
      teachers,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    res.status(500).send({ error: "교사 정보를 불러오는데 실패했습니다." });
  }
};

module.exports = { getStudents, getTeachers };
