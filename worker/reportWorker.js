const amqp = require('amqplib/callback_api');
const mongoose = require('mongoose');
const { Schema } = mongoose;
require('dotenv').config();  // dotenv 패키지를 사용하여 환경 변수를 로드합니다.

const studentSchema = new mongoose.Schema({
    studentId: { type: String, required: true }, // 출석번호
    name: { type: String, required: true },
    password: { type: String, required: true },
    grade: { type: Number, required: true },
    class: { type: String, required: true }, // 반
    school: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    role: { type: String, default: 'student' },
    tokens: [{ token: { type: String, required: true } }],
  });  
  
const Student = mongoose.model('Student', studentSchema);

const studentReportSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // 학생 ID
  subject: { type: String, required: true }, // 과목
  semester: { type: String, required: true }, // 학기
  comment: { type: String, required: true }, // 생성된 평어
  createdAt: { type: Date, default: Date.now } // 생성 날짜
});

const StudentReport = mongoose.model('StudentReport', studentReportSchema);

const resultSchema = new mongoose.Schema({
    questionId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true }, // 퀴즈 문제 ID
    taskText: { type: String, required: true }, // 문제 텍스트
    correctAnswer: { type: String, required: true }, // 정답
    studentAnswer: { type: String, required: true }, // 학생의 답변
    similarity: { type: Number, required: true } // 유사도 점수 (0 ~ 100)
  });
  
const quizResultSchema = new mongoose.Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // 학생 ID
    subject: { type: String, required: true }, // 과목
    semester: { type: String, required: true }, // 학기
    unit: { type: String, required: true }, // 단원
    results: [resultSchema], // 개별 질문의 결과 배열
    score: { type: Number, required: true }, // 전체 점수 (평균 유사도 점수)
    createdAt: { type: Date, default: Date.now } // 생성 날짜
  });
  
const QuizResult = mongoose.model('QuizResult', quizResultSchema);

const RatingSchema = new Schema({
  level: { 
    type: String, 
    required: true, 
    enum: ['상', '중', '하'] 
  },
  comments: [{ type: String }]
});

const UnitSchema = new Schema({
  name: { type: String, required: true },
  ratings: [RatingSchema]
});

const SubjectSchema = new Schema({
  name: { type: String, required: true },
  grade: { type: Number, required: true },
  semester: { type: String, required: true },
  units: [UnitSchema]
});

const Subject = mongoose.model('Subject', SubjectSchema);

mongoose.connect(process.env.MONGODB_URL, {})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

amqp.connect(process.env.RABBITMQ_URL, (err, connection) => {
  if (err) {
    throw err;
  }
  connection.createChannel((err, channel) => {
    if (err) {
      throw err;
    }
    channel.assertQueue('report_queue', { durable: true });
    channel.prefetch(1);

    channel.consume('report_queue', async (msg) => {
      const reportData = JSON.parse(msg.content.toString());
      const { selectedSemesters, selectedSubjects, selectedStudents, reportLines } = reportData;

      try {
        for (const studentId of selectedStudents) {
        //   console.log(studentId);
          const student = await Student.findOne({ '_id': studentId });
        //   console.log(student);
          const grade = student.grade;
          for (const semester of selectedSemesters) {
            for (const subject of selectedSubjects) {
              // 해당 학생, 학기, 과목에 대한 퀴즈 결과를 점수 순으로 가져오기
              const quizResults = await QuizResult.find({ studentId, semester, subject })
                .sort({ score: -1 })
                .limit(reportLines);

            //   console.log ('퀴즈결과'+quizResults);

              let comments = [];

              for (const result of quizResults) {
                const unit = result.unit;
                const score = result.score;

                // console.log ('단원'+unit);
                // console.log ('점수'+score);
                // console.log ('학년'+grade);

                const subjectData = await Subject.findOne({ name: subject, grade, semester });
                // console.log('과목정보'+subjectData)
                if (subjectData) {
                  const unitData = subjectData.units.find(u => u.name === unit);
                //   console.log (unitData);
                  if (unitData) {
                    if (score >= 80) {
                      const highRatings = unitData.ratings.find(r => r.level === '상');
                    //   console.log (highRatings);
                      if (highRatings) {
                        comments.push(highRatings.comments[Math.floor(Math.random() * highRatings.comments.length)]);
                      }
                    } else if (score >= 60) {
                      const midRatings = unitData.ratings.find(r => r.level === '중');
                    //   console.log (midRatings);
                      if (midRatings) {
                        comments.push(midRatings.comments[Math.floor(Math.random() * midRatings.comments.length)]);
                      }
                    } else {
                      const lowRatings = unitData.ratings.find(r => r.level === '하');
                    //   console.log (lowRatings);
                      if (lowRatings) {
                        comments.push(lowRatings.comments[Math.floor(Math.random() * lowRatings.comments.length)]);
                      }
                    }
                  }
                }
              }

              // 평어 보고서 저장 또는 업데이트
              const reportComment = comments.join(' ');

              await StudentReport.findOneAndUpdate(
                { studentId, subject, semester },
                { comment: reportComment },
                { upsert: true }
              );
            }
          }
        }

        channel.ack(msg);
      } catch (error) {
        console.error('Failed to generate report:', error);
        channel.nack(msg, false, false); // 메시지 다시 처리하지 않음
      }
    }, { noAck: false });
  });
});
