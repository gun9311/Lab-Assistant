const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentReportSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // 학생 ID
  subject: { type: String, required: true }, // 과목
  semester: { type: String, required: true }, // 학기
  comment: { type: String, required: true }, // 생성된 평어
  createdAt: { type: Date, default: Date.now } // 생성 날짜
});

// 복합 인덱스 설정
studentReportSchema.index({ studentId: 1, subject: 1, semester: 1 }, { unique: true });

const StudentReport = mongoose.model('StudentReport', studentReportSchema);

module.exports = StudentReport;