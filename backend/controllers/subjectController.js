const Subject = require("../models/Subject");
const logger = require("../utils/logger"); // G_TOKEN_REPLACEMENT_

// 과목 추가
const addSubject = async (req, res) => {
  const { name, grade, semester, units } = req.body;
  try {
    const subject = new Subject({ name, grade, semester, units });
    await subject.save();
    res.status(201).send(subject);
  } catch (error) {
    logger.error("과목 추가에 실패했습니다.", error); // G_TOKEN_REPLACEMENT_
    res.status(400).send({ error: "과목 추가에 실패했습니다." });
  }
};

// 과목 조회
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.status(200).send(subjects);
  } catch (error) {
    logger.error("과목 정보를 불러오는데 실패했습니다.", error); // G_TOKEN_REPLACEMENT_
    res.status(500).send({ error: "과목 정보를 불러오는데 실패했습니다." });
  }
};

// 과목 조회
const getSubjects = async (req, res) => {
  const { grade, semester } = req.query;

  try {
    let query = {};
    if (grade) {
      query.grade = parseInt(grade);
    }
    if (semester) {
      query.semester = { $in: semester.split(",") };
    }

    const subjects = await Subject.find(query); // .sort({ name: 1 }) 제거 또는 유지

    // 과목 이름만 추출하여 중복 없이 배열로 반환
    const subjectNames = [...new Set(subjects.map((s) => s.name))];

    const predefinedOrder = [
      "국어",
      "도덕",
      "수학",
      "과학",
      "사회",
      "영어",
      "음악",
      "미술",
      "체육",
      "실과",
      "통합교과",
    ];
    const sortedSubjectNames = subjectNames.sort((a, b) => {
      const indexA = predefinedOrder.indexOf(a);
      const indexB = predefinedOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    res.status(200).send(sortedSubjectNames); // 최종적으로 이 배열이 보내져야 합니다.
  } catch (error) {
    logger.error("과목 정보를 불러오는데 실패했습니다.", error);
    res.status(500).send({ error: "과목 정보를 불러오는데 실패했습니다." });
  }
};

const getUnits = async (req, res) => {
  const { grade, semester, subject, subjects, semesters } = req.query;

  try {
    if (subjects && semesters) {
      // 복수 과목 및 학기 처리
      const subjectNames = subjects.split(",");
      const semestersList = semesters.split(",");

      const subjectsData = await Subject.find({
        name: { $in: subjectNames },
        grade: parseInt(grade),
        semester: { $in: semestersList },
      });

      // 과목별 단원 데이터를 구성
      const unitsBySubject = subjectsData.reduce((acc, subject) => {
        acc[subject.name] = subject.units.map((unit) => unit.name);
        return acc;
      }, {});

      res.status(200).send({ units: unitsBySubject });
    } else if (subject && semester) {
      // 단일 과목 및 학기 처리
      const subjectData = await Subject.findOne({
        name: subject,
        grade: parseInt(grade),
        semester,
      });

      if (!subjectData) {
        return res.status(404).send({ error: "과목을 찾을 수 없습니다." });
      }

      // 단원 목록만 반환 (기존 동작 유지)
      const units = subjectData.units.map((unit) => unit.name);
      res.status(200).send({ units });
    } else {
      return res.status(400).send({ error: "잘못된 파라미터입니다." });
    }
  } catch (error) {
    logger.error("Failed to fetch units:", error); // G_TOKEN_REPLACEMENT_
    res.status(500).send({ error: "단원 정보를 불러오는데 실패했습니다." });
  }
};

const getUnitRatings = async (req, res) => {
  const { grade, semester, subjectName, unitName } = req.query;

  if (!grade || !semester || !subjectName || !unitName) {
    return res.status(400).send({
      error: "모든 파라미터(학년, 학기, 과목명, 단원명)가 필요합니다.",
    });
  }

  try {
    const subject = await Subject.findOne({
      grade: parseInt(grade),
      semester,
      name: subjectName,
    });

    if (!subject) {
      return res.status(404).send({ error: "해당 과목을 찾을 수 없습니다." });
    }

    const unit = subject.units.find((u) => u.name === unitName);

    if (!unit) {
      return res.status(404).send({ error: "해당 단원을 찾을 수 없습니다." });
    }

    // 평어가 없는 경우 ratings는 빈 배열일 수 있음. 그대로 반환.
    res.status(200).send(unit.ratings);
  } catch (error) {
    logger.error("Error fetching unit ratings:", error);
    res
      .status(500)
      .send({ error: "단원 평어 정보를 불러오는데 실패했습니다." });
  }
};

const getCommentsForLibrary = async (req, res) => {
  const { grade, semesters, subjects, themes, keyword } = req.query;

  try {
    const pipeline = [];

    // Stage 1: Initial Match
    const initialMatch = {};
    if (grade) initialMatch.grade = parseInt(grade);
    if (semesters) initialMatch.semester = { $in: semesters.split(",") };
    if (subjects) initialMatch.name = { $in: subjects.split(",") };
    if (Object.keys(initialMatch).length > 0) {
      pipeline.push({ $match: initialMatch });
    }

    // Unwind all necessary arrays to filter comments
    pipeline.push({ $unwind: "$units" });
    pipeline.push({ $unwind: "$units.ratings" });

    // Stage 2: Filter by theme (level)
    if (themes) {
      const themeMap = {
        "심화·응용": "상",
        "성장·과정": "중",
        "태도·잠재력": "하",
      };
      const dbThemes = themes
        .split(",")
        .map((t) => themeMap[t])
        .filter(Boolean);
      if (dbThemes.length > 0) {
        pipeline.push({
          $match: { "units.ratings.level": { $in: dbThemes } },
        });
      }
    }

    pipeline.push({ $unwind: "$units.ratings.comments" });

    // Stage 3: Filter by keyword (case-insensitive)
    if (keyword) {
      pipeline.push({
        $match: {
          "units.ratings.comments": { $regex: keyword, $options: "i" },
        },
      });
    }

    // Stage 4: Grouping everything back together
    pipeline.push({
      $group: {
        _id: {
          subjectName: "$name",
          semester: "$semester",
          unitName: "$units.name",
          level: "$units.ratings.level",
        },
        comments: { $push: "$units.ratings.comments" },
      },
    });

    pipeline.push({
      $group: {
        _id: {
          subjectName: "$_id.subjectName",
          semester: "$_id.semester",
          unitName: "$_id.unitName",
        },
        ratings: {
          $push: {
            level: "$_id.level",
            comments: "$comments",
          },
        },
      },
    });

    pipeline.push({ $sort: { "_id.unitName": 1 } });

    pipeline.push({
      $group: {
        _id: {
          subjectName: "$_id.subjectName",
          semester: "$_id.semester",
        },
        units: {
          $push: {
            unitName: "$_id.unitName",
            ratings: "$ratings",
          },
        },
      },
    });

    pipeline.push({ $sort: { "_id.semester": 1 } });

    pipeline.push({
      $group: {
        _id: "$_id.subjectName",
        semesters: {
          $push: {
            semester: "$_id.semester",
            units: "$units",
          },
        },
      },
    });

    // Stage 5: Final projection and sort
    const predefinedOrder = [
      "국어",
      "도덕",
      "수학",
      "과학",
      "사회",
      "영어",
      "음악",
      "미술",
      "체육",
      "실과",
      "통합교과",
    ];
    pipeline.push({
      $project: {
        _id: 0,
        subjectName: "$_id",
        semesters: "$semesters",
        sortOrder: { $indexOfArray: [predefinedOrder, "$_id"] },
      },
    });
    pipeline.push({ $sort: { sortOrder: 1 } });
    pipeline.push({ $project: { sortOrder: 0 } });

    const results = await Subject.aggregate(pipeline);
    res.status(200).send(results);
  } catch (error) {
    logger.error("Error fetching comments for library:", error);
    res.status(500).send({ error: "평어 라이브러리 조회에 실패했습니다." });
  }
};

// 여러 개의 유닛 추가
const addUnits = async (req, res) => {
  const { subject, units } = req.body; // units는 배열로 받음
  if (!subject || !units || !Array.isArray(units)) {
    return res.status(400).send({ error: "잘못된 데이터 형식입니다." });
  }

  try {
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      return res.status(404).send({ error: "과목을 찾을 수 없습니다." });
    }

    units.forEach((unit) => subjectDoc.units.push({ name: unit }));
    await subjectDoc.save();
    res.status(200).send(subjectDoc);
  } catch (error) {
    logger.error("Error adding units:", error); // G_TOKEN_REPLACEMENT_
    res.status(500).send({ error: "단원 추가에 실패했습니다." });
  }
};

const addUnitRating = async (req, res) => {
  const { subjectId, unitName, ratingLevel, comment } = req.body;
  try {
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ error: "과목을 찾을 수 없습니다." });
    }

    const unit = subject.units.find((u) => u.name === unitName);
    if (!unit) {
      return res.status(404).send({ error: "단원을 찾을 수 없습니다." });
    }

    let rating = unit.ratings.find((r) => r.level === ratingLevel);
    if (!rating) {
      rating = { level: ratingLevel, comments: [] };
      unit.ratings.push(rating);
    }

    // 중복된 평어가 존재하는지 확인
    if (!rating.comments.includes(comment)) {
      rating.comments.push(comment);
    }

    await subject.save();
    res.status(200).send(subject);
  } catch (error) {
    logger.error("Error adding unit rating:", error); // G_TOKEN_REPLACEMENT_
    res.status(500).send({ error: "단원 평어 추가에 실패했습니다." });
  }
};

module.exports = {
  addSubject,
  getAllSubjects,
  getSubjects,
  getUnits,
  addUnits,
  addUnitRating,
  getUnitRatings,
  getCommentsForLibrary,
};
