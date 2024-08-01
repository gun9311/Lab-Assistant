const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { fromEnv } = require('@aws-sdk/credential-providers');
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




// AWS SQS 설정
const sqsClient = new SQSClient({
  region: process.env.SQS_REGION,
  credentials: fromEnv(),
});

const queueUrl = process.env.REPORT_QUEUE_URL;

const processMessage = async (message) => {
  const reportData = JSON.parse(message.Body);
  const { selectedSemesters, selectedSubjects, selectedStudents, reportLines } = reportData;

  try {
    for (const studentId of selectedStudents) {
      const student = await Student.findOne({ '_id': studentId });
      const grade = student.grade;
      for (const semester of selectedSemesters) {
        for (const subject of selectedSubjects) {
          const quizResults = await QuizResult.find({ studentId, semester, subject })
            .sort({ score: -1 })
            .limit(reportLines);

          let comments = [];

          for (const result of quizResults) {
            const unit = result.unit;
            const score = result.score;

            const subjectData = await Subject.findOne({ name: subject, grade, semester });
            if (subjectData) {
              const unitData = subjectData.units.find(u => u.name === unit);
              if (unitData) {
                if (score >= 80) {
                  const highRatings = unitData.ratings.find(r => r.level === '상');
                  if (highRatings) {
                    comments.push(highRatings.comments[Math.floor(Math.random() * highRatings.comments.length)]);
                  }
                } else if (score >= 60) {
                  const midRatings = unitData.ratings.find(r => r.level === '중');
                  if (midRatings) {
                    comments.push(midRatings.comments[Math.floor(Math.random() * midRatings.comments.length)]);
                  }
                } else {
                  const lowRatings = unitData.ratings.find(r => r.level === '하');
                  if (lowRatings) {
                    comments.push(lowRatings.comments[Math.floor(Math.random() * lowRatings.comments.length)]);
                  }
                }
              }
            }
          }

          const reportComment = comments.join(' ');

          await StudentReport.findOneAndUpdate(
            { studentId, subject, semester },
            { comment: reportComment },
            { upsert: true }
          );
        }
      }
    }

    // 메시지 삭제
    const deleteParams = {
      QueueUrl: queueUrl,
      ReceiptHandle: message.ReceiptHandle,
    };
    await sqsClient.send(new DeleteMessageCommand(deleteParams));
    console.log('Message deleted:', message.ReceiptHandle); // 메시지 삭제 확인 로그
  } catch (error) {
    console.error('Failed to generate report:', error);
  }
};

const pollMessages = async () => {
  const params = {
    QueueUrl: queueUrl,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 300, // 메시지 가시성 타임아웃을 300초로 설정
  };

  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params));
    if (data.Messages) {
      for (const message of data.Messages) {
        await processMessage(message);
      }
    }
  } catch (error) {
    console.error('Error receiving messages from SQS:', error);
  }
};

// 지속적으로 메시지를 폴링하여 처리
setInterval(pollMessages, 10000); // 10초 간격으로 폴링