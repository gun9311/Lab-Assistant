const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true }, // 수신자의 ObjectId
  recipientType: { type: String, required: true, enum: ["Student", "Teacher"] }, // 수신자 유형
  message: { type: String, required: true }, // 알림 메시지
  type: { type: String, required: true }, // 알림 유형 (예: 'quiz_result', 'report_ready')
  createdAt: { type: Date, default: Date.now }, // 생성 시각
  read: { type: Boolean, default: false }, // 읽음 여부
  data: { type: mongoose.Schema.Types.Mixed }, // 추가 데이터 (예: 퀴즈 ID 또는 리포트 ID)
});

// --- 인덱스 추가 ---
// 사용자가 자신의 알림을 최신순으로 조회하는 경우 사용
notificationSchema.index({ recipientId: 1, createdAt: -1 });
// 사용자가 자신의 읽지 않은 알림을 조회하거나 업데이트하는 경우 사용
notificationSchema.index({ recipientId: 1, read: 0 }); // read: false 인 경우

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
