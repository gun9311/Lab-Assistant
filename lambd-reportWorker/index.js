const mongoose = require("mongoose");
const { Schema } = mongoose;
const axios = require('axios');
require("dotenv").config();

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
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL, {});
    isConnected = true;
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
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
    console.log("Message body:", message.body);
    reportData = JSON.parse(message.body);
  } catch (error) {
    console.error("Invalid JSON format:", message.body);
    return;
  }

  const { selectedSemesters, selectedSubjects, selectedStudents, reportLines, teacherId } = reportData;

  try {
    console.time("Total Processing Time");

    // 학생 및 과목 데이터를 조회
    const students = await Student.find({ _id: { $in: selectedStudents } });
    const subjects = await Subject.find({
      name: { $in: selectedSubjects },
      grade: { $in: students.map(s => s.grade) },
      semester: { $in: selectedSemesters },
    });

    const promises = [];
    const studentGrade = students[0].grade; // 학생들의 학년은 동일하므로 첫 번째 학생의 학년을 사용

    for (const student of students) {
      for (const semester of selectedSemesters) {
        for (const subjectName of selectedSubjects) {
          const subjectData = subjects.find(s => s.name === subjectName && s.grade === student.grade && s.semester === semester);

          if (!subjectData) continue;

          promises.push((async () => {
            console.time(`Quiz Results Query: ${student._id} - ${semester} - ${subjectName}`);
            const quizResults = await QuizResult.find({
              studentId: student._id,
              semester,
              subject: subjectName,
            })
              .sort({ score: -1 })
              .limit(reportLines);
            console.timeEnd(`Quiz Results Query: ${student._id} - ${semester} - ${subjectName}`);

            let comments = [];

            for (const result of quizResults) {
              const unitData = subjectData.units.find(u => u.name === result.unit);
              if (!unitData) continue;

              const ratingLevel = result.score >= 80 ? "상" : result.score >= 60 ? "중" : "하";
              const ratingData = unitData.ratings.find(r => r.level === ratingLevel);

              if (ratingData) {
                comments.push(
                  ratingData.comments[
                    Math.floor(Math.random() * ratingData.comments.length)
                  ]
                );
              }
            }

            const reportComment = comments.join(" ");

            console.time(`Student Report Update: ${student._id} - ${subjectName} - ${semester}`);
            await StudentReport.findOneAndUpdate(
              { studentId: student._id, subject: subjectName, semester },
              { comment: reportComment },
              { upsert: true }
            );
            console.timeEnd(`Student Report Update: ${student._id} - ${subjectName} - ${semester}`);
          })());
        }
      }
    }

    await Promise.all(promises);
    console.timeEnd("Total Processing Time");

    // 리포트 생성이 완료된 후 알림 전송
    const reportDetails = { 
      grade: studentGrade, // 학년 정보 추가
      selectedSemesters, 
      selectedSubjects, 
      selectedStudents 
    };
    await sendNotificationToTeacher(teacherId, reportDetails);
  } catch (error) {
    console.error("Failed to generate report:", error);
  }
};

exports.handler = async (event) => {
  console.log("Event received:", event);

  // 데이터베이스 연결 확인 및 설정
  await connectToDatabase();

  for (const record of event.Records) {
    await processMessage(record);
  }
};
