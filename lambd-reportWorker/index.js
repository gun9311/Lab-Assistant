const mongoose = require("mongoose");
const { Schema } = mongoose;
const axios = require("axios");
require("dotenv").config();

// 기존 스키마 유지
const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  grade: { type: Number, required: true },
  class: { type: String, required: true },
  school: { type: String, required: true },
  role: { type: String, default: "student" },
  tokens: [{ token: { type: String, required: true } }],
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

const resultSchema = new mongoose.Schema({
  questionId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  taskText: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  studentAnswer: { type: String, required: false },
  similarity: { type: Number, required: true },
});

const quizResultSchema = new mongoose.Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },
  results: [resultSchema],
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
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
      console.log('Generation method: Line-based');
      for (const studentId of selectedStudents) {
        console.log(`Processing student: ${studentId}`);
        const student = await Student.findOne({ '_id': studentId });
        if (!student) {
          console.error(`Student not found: ${studentId}`);
          continue;
        }

        const grade = student.grade;
        for (const semester of selectedSemesters) {
          console.log(`Processing semester: ${semester}`);
          for (const subject of selectedSubjects) {
            console.log(`Processing subject: ${subject}`);
            const quizResults = await QuizResult.find({ studentId, semester, subject })
              .sort({ score: -1 })
              .limit(reportLines);

            let comments = [];
            if (quizResults.length === 0) {
              console.warn(`No quiz results found for student ${studentId}, semester ${semester}, subject ${subject}`);
              await StudentReport.findOneAndUpdate(
                { studentId, subject, semester },
                { comment: "해당 과목에 대한 퀴즈 결과가 없습니다." },
                { upsert: true }
              );
              continue;
            }

            for (const result of quizResults) {
              const unit = result.unit;
              const score = result.score;
              console.log(`Processing result: ${result._id}, Score: ${score}, Unit: ${unit}`);

              const subjectData = await Subject.findOne({ name: subject, grade, semester });
              if (!subjectData) {
                console.error(`Subject data not found for name: ${subject}, grade: ${grade}, semester: ${semester}`);
                continue;
              }

              const unitData = subjectData.units.find(u => u.name === unit);
              if (!unitData) {
                console.error(`Unit data not found for unit: ${unit} in subject: ${subject}`);
                continue;
              }

              const ratingLevel = score >= 80 ? '상' : score >= 60 ? '중' : '하';
              const ratingData = unitData.ratings.find(r => r.level === ratingLevel);
              if (ratingData) {
                const comment = ratingData.comments[Math.floor(Math.random() * ratingData.comments.length)];
                console.log(`Selected comment: ${comment}`);
                comments.push(comment);
              }
            }

            const reportComment = comments.join(' ');
            console.log(`Generated report comment for student ${studentId}, subject ${subject}, semester ${semester}: ${reportComment}`);

            await StudentReport.findOneAndUpdate(
              { studentId, subject, semester },
              { comment: reportComment },
              { upsert: true }
            );
          }
        }
      }
    } else if (generationMethod === "unit_based") {
      console.log('Generation method: Unit-based');
      for (const studentId of selectedStudents) {
        console.log(`Processing student: ${studentId}`);
        for (const subject of selectedSubjects) {
          const unitsForSubject = selectedUnits[subject] || [];
          for (const semester of selectedSemesters) {
            let comments = [];
            let hasQuizResult = false; // 단원에 대한 퀴즈 결과 존재 여부 확인
            for (const unit of unitsForSubject) {
              const quizResults = await QuizResult.find({
                studentId,
                subject,
                semester,
                unit
              });

              if (quizResults.length === 0) {
                console.warn(`No quiz results found for student ${studentId}, unit ${unit}`);
                continue;
              }

              hasQuizResult = true; // 퀴즈 결과가 있는 경우

              for (const result of quizResults) {
                const subjectData = await Subject.findOne({ name: subject, semester, "units.name": unit });
                if (!subjectData) continue;

                const unitData = subjectData.units.find(u => u.name === unit);
                if (!unitData) continue;

                const ratingLevel = result.score >= 80 ? "상" : result.score >= 60 ? "중" : "하";
                const ratingData = unitData.ratings.find(r => r.level === ratingLevel);

                if (ratingData) {
                  const comment = ratingData.comments[Math.floor(Math.random() * ratingData.comments.length)];
                  console.log(`Selected comment: ${comment}`);
                  comments.push(comment);
                }
              }
            }

            if (!hasQuizResult) {
              await StudentReport.findOneAndUpdate(
                { studentId, subject, semester },
                { comment: "해당 과목에 대한 퀴즈 결과가 없습니다." },
                { upsert: true }
              );
              continue;
            }

            const reportComment = comments.join(" ");
            console.log(`Generated report comment for student ${studentId}, subject ${subject}, semester ${semester}: ${reportComment}`);

            await StudentReport.findOneAndUpdate(
              { studentId, subject, semester },
              { comment: reportComment },
              { upsert: true }
            );
          }
        }
      }
    }

    console.log('Report generated successfully.');

    await sendNotificationToTeacher(teacherId, {
      selectedSemesters,
      selectedSubjects,
      selectedStudents,
      selectedUnits,
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