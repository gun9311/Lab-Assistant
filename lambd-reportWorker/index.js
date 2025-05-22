const mongoose = require("mongoose");
const { Schema } = mongoose;
const axios = require("axios");
require("dotenv").config();

// 기존 스키마 유지
const studentSchema = new mongoose.Schema({
  loginId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true }, // 출석번호
  name: { type: String, required: true },
  password: { type: String, required: true },
  grade: { type: Number, required: true },
  class: { type: String, required: true }, // 반
  school: { type: String, required: true },
  role: { type: String, default: "student" },
  tokens: [{ token: { type: String, required: false } }], // FCM 토큰 저장
  dailyChatCount: { type: Number, default: 0 },
  lastChatDay: { type: String, default: null }, // 예: "YYYY-MM-DD"
  monthlyChatCount: { type: Number, default: 0 },
  lastChatMonth: { type: String, default: null }, // 예: "YYYY-MM"
});

const Student = mongoose.model("Student", studentSchema);

const studentReportSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const StudentReport = mongoose.model("StudentReport", studentReportSchema);

// 개별 문제의 결과 스키마
const resultSchema = new mongoose.Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    required: true,
  }, // 퀴즈 문제 ID (세션 스냅샷 내 질문 객체의 _id)
  studentAnswer: { type: Number, required: false }, // 학생의 답변 (선택지 인덱스 등)
  isCorrect: { type: Boolean, required: true }, // 정답 여부 (True/False)
});

// 퀴즈 결과 스키마
const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true }, // 학생 ID

  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "KahootQuizSession", // KahootQuizSession 모델 참조
    required: true,
  },

  // quizId 필드 제거: 원본 KahootQuizContent에 대한 직접 참조 불필요

  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },

  results: [resultSchema], // 개별 질문의 결과 배열
  score: { type: Number, required: true }, // 전체 점수 (정답 개수 기반)
  createdAt: { type: Date, default: Date.now }, // 생성 날짜
});
const QuizResult = mongoose.model("QuizResult", quizResultSchema);

const RatingSchema = new Schema({
  level: {
    type: String,
    required: true,
    enum: ["상", "중", "하"],
  },
  comments: [{ type: String }],
});

const UnitSchema = new Schema({
  name: { type: String, required: true },
  ratings: [RatingSchema],
});

const SubjectSchema = new Schema({
  name: { type: String, required: true },
  grade: { type: Number, required: true },
  semester: { type: String, required: true },
  units: [UnitSchema],
});

const Subject = mongoose.model("Subject", SubjectSchema);

let isConnected = false;

const connectToDatabase = async () => {
  if (!isConnected) {
    try {
      await mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      isConnected = true;
      console.log("MongoDB connected");
    } catch (error) {
      console.error("MongoDB connection error:", error);
    }
  }
};

const sendNotificationToTeacher = async (teacherId, reportDetails) => {
  try {
    await axios.post(process.env.REPORT_NOTIFICATION_API_URL, {
      teacherId,
      reportDetails,
    });
  } catch (error) {
    console.error("Failed to send notification to teacher:", error);
  }
};

// 랜덤 평어 생성 함수 수정
const getRandomComment = async (
  subject,
  grade,
  semester,
  unit,
  usedUnits = [],
  allowDuplicates = false
) => {
  const subjectData = await Subject.findOne({ name: subject, grade, semester });
  if (!subjectData) return null;

  // 중복 허용 시에는 usedUnits을 필터링하지 않음
  const availableUnits = unit
    ? [subjectData.units.find((u) => u.name === unit)]
    : allowDuplicates
    ? subjectData.units
    : subjectData.units.filter((u) => !usedUnits.includes(u.name));

  if (availableUnits.length === 0) return null;

  const unitData = unit
    ? availableUnits[0]
    : availableUnits[Math.floor(Math.random() * availableUnits.length)];

  const ratingLevels = ["상", "중", "하"];
  const randomLevel =
    ratingLevels[Math.floor(Math.random() * ratingLevels.length)];
  const ratingData = unitData.ratings.find((r) => r.level === randomLevel);

  return {
    unit: unitData.name,
    comment:
      ratingData.comments[
        Math.floor(Math.random() * ratingData.comments.length)
      ],
  };
};

const processMessage = async (message) => {
  console.log("Received message:", message);
  if (!message || !message.body) {
    console.error("Message body is undefined");
    return;
  }

  let reportData;
  try {
    reportData = JSON.parse(message.body);
  } catch (error) {
    console.error("Invalid JSON format:", message.body);
    return;
  }

  const {
    grade,
    selectedSemesters,
    selectedSubjects,
    selectedStudents,
    reportLines,
    selectedUnits,
    generationMethod,
    teacherId,
  } = reportData;

  try {
    if (generationMethod === "line_based") {
      console.log("Generation method: Line-based");
      for (const studentId of selectedStudents) {
        console.log(`Processing student: ${studentId}`);
        const student = await Student.findOne({ _id: studentId });
        if (!student) {
          console.error(`Student not found: ${studentId}`);
          continue;
        }

        const grade = student.grade;
        for (const semester of selectedSemesters) {
          console.log(`Processing semester: ${semester}`);
          for (const subject of selectedSubjects) {
            console.log(`Processing subject: ${subject}`);
            const quizResults = await QuizResult.find({
              studentId,
              semester,
              subject,
            });

            // 단원별 최고 점수 결과
            const bestResultsByUnit = quizResults.reduce((acc, result) => {
              const unit = result.unit;
              if (!acc[unit] || acc[unit].score < result.score) {
                acc[unit] = result;
              }
              return acc;
            }, {});

            const selectedResults = Object.values(bestResultsByUnit)
              .sort((a, b) => b.score - a.score)
              .slice(0, reportLines);

            let comments = [];

            // 실제 결과 기반 평어 생성
            for (const result of selectedResults) {
              const subjectData = await Subject.findOne({
                name: subject,
                grade,
                semester,
              });
              if (!subjectData) continue;

              const unitData = subjectData.units.find(
                (u) => u.name === result.unit
              );
              if (!unitData) continue;

              const ratingLevel =
                result.score >= 75 ? "상" : result.score >= 55 ? "중" : "하";
              const ratingData = unitData.ratings.find(
                (r) => r.level === ratingLevel
              );
              if (ratingData) {
                comments.push(
                  ratingData.comments[
                    Math.floor(Math.random() * ratingData.comments.length)
                  ]
                );
              }
            }

            // 실제 결과가 있는 단원들 추적
            const usedUnits = selectedResults.map((result) => result.unit);

            // 부족한 줄 수만큼 랜덤 평어 추가 (중복 제외)
            const remainingLines = reportLines - comments.length;

            // 과목의 모든 단원 정보 가져오기
            const subjectData = await Subject.findOne({
              name: subject,
              grade,
              semester,
            });

            // 해당 과목/학기의 전체 단원 수 확인
            const totalUnitsCount = subjectData?.units?.length || 0;
            const remainingUnitsCount = totalUnitsCount - usedUnits.length;

            // 중복 허용 여부 결정 - 남은 단원 수가 필요한 줄 수보다 적을 때만 허용
            const allowDuplicates = remainingUnitsCount < remainingLines;

            // 균등 분배를 위한 준비 (중복 허용 시)
            let unitUsageCount = {};
            if (allowDuplicates && totalUnitsCount > 0) {
              // 모든 단원의 사용 횟수 초기화
              subjectData.units.forEach((unit) => {
                unitUsageCount[unit.name] = usedUnits.includes(unit.name)
                  ? 1
                  : 0;
              });
            }

            for (let i = 0; i < remainingLines; i++) {
              if (allowDuplicates && totalUnitsCount > 0) {
                // 가장 적게 사용된 단원 선택 (균등 분배)
                const leastUsedUnit = Object.keys(unitUsageCount).reduce(
                  (a, b) => (unitUsageCount[a] <= unitUsageCount[b] ? a : b)
                );

                // 선택된 단원에 대한 평어 생성
                const randomResult = await getRandomComment(
                  subject,
                  grade,
                  semester,
                  leastUsedUnit
                );

                if (randomResult) {
                  comments.push(randomResult.comment);
                  unitUsageCount[leastUsedUnit]++;
                }
              } else {
                // 기존 로직: 중복 없이 랜덤 단원 선택
                const randomResult = await getRandomComment(
                  subject,
                  grade,
                  semester,
                  null,
                  usedUnits,
                  false
                );

                if (randomResult) {
                  comments.push(randomResult.comment);
                  usedUnits.push(randomResult.unit);
                } else if (allowDuplicates) {
                  // 중복을 허용해도 평어를 생성할 수 없는 경우 (단원이 없는 경우)
                  break;
                }
              }
            }

            const reportComment = comments.join(" ");
            console.log(
              `Generated report comment for student ${studentId}, subject ${subject}, semester ${semester}: ${reportComment}`
            );

            await StudentReport.findOneAndUpdate(
              { studentId, subject, semester },
              { comment: reportComment },
              { upsert: true }
            );
          }
        }
      }
    } else if (generationMethod === "unit_based") {
      console.log("Generation method: Unit-based");
      for (const studentId of selectedStudents) {
        console.log(`Processing student: ${studentId}`);
        for (const subject of selectedSubjects) {
          const unitsForSubject = selectedUnits[subject] || [];
          for (const semester of selectedSemesters) {
            let comments = [];

            for (const unit of unitsForSubject) {
              const quizResults = await QuizResult.find({
                studentId,
                subject,
                semester,
                unit,
              })
                .sort({ score: -1 })
                .limit(1);

              if (quizResults.length > 0) {
                // 퀴즈 결과가 있는 경우 실제 결과 기반 평어
                const result = quizResults[0];
                const subjectData = await Subject.findOne({
                  name: subject,
                  grade,
                  semester,
                });
                if (!subjectData) continue;

                const unitData = subjectData.units.find((u) => u.name === unit);
                if (!unitData) continue;

                const ratingLevel =
                  result.score >= 75 ? "상" : result.score >= 55 ? "중" : "하";
                const ratingData = unitData.ratings.find(
                  (r) => r.level === ratingLevel
                );
                if (ratingData) {
                  const comment =
                    ratingData.comments[
                      Math.floor(Math.random() * ratingData.comments.length)
                    ];
                  comments.push(comment);
                }
              } else {
                // 해당 단원에 대해서만 랜덤 평어 생성 (다른 단원 고려할 필요 없음)
                const randomResult = await getRandomComment(
                  subject,
                  grade,
                  semester,
                  unit
                );
                if (randomResult) {
                  comments.push(randomResult.comment);
                }
              }
            }

            const reportComment = comments.join(" ");
            console.log(
              `Generated report comment for student ${studentId}, subject ${subject}, semester ${semester}: ${reportComment}`
            );

            await StudentReport.findOneAndUpdate(
              { studentId, subject, semester },
              { comment: reportComment },
              { upsert: true }
            );
          }
        }
      }
    }

    console.log("Report generated successfully.");

    await sendNotificationToTeacher(teacherId, {
      grade,
      selectedSemesters,
      selectedSubjects,
      selectedStudents,
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
  }
};

exports.handler = async (event) => {
  console.log("Event received:", event);

  await connectToDatabase();

  for (const record of event.Records) {
    await processMessage(record);
  }
};
