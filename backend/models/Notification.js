const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true }, // 수신자의 ObjectId
  recipientType: { type: String, required: true, enum: ['Student', 'Teacher'] }, // 수신자 유형
  message: { type: String, required: true }, // 알림 메시지
  type: { type: String, required: true }, // 알림 유형 (예: 'quiz_result', 'report_ready')
  createdAt: { type: Date, default: Date.now }, // 생성 시각
  read: { type: Boolean, default: false }, // 읽음 여부
  data: { type: mongoose.Schema.Types.Mixed }, // 추가 데이터 (예: 퀴즈 ID 또는 리포트 ID)
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
