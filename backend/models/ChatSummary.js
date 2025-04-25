const mongoose = require("mongoose");

const chatSummarySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
    // index: true // 이렇게 직접 추가하거나 아래 index 메소드를 사용
  },
  subjects: [
    {
      subject: { type: String, required: true },
      summaries: [
        {
          summary: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      // 필요하다면 subject 필드에도 인덱스 고려 가능
      // index: true
    },
  ],
});

// --- 인덱스 추가 ---
// student 필드를 기준으로 데이터를 조회하는 경우가 많으므로 인덱스 추가
chatSummarySchema.index({ student: 1 });

// 'subjects.summaries.summary' 필드에 대한 텍스트 인덱스 (Aggregation 사용 시 불필요할 수 있음)
// chatSummarySchema.index({ 'subjects.summaries.summary': 'text' });

// 필요 시 subjects 배열 내의 subject 필드에도 인덱스 추가 가능
// chatSummarySchema.index({ 'subjects.subject': 1 });

// *** 변경: 복합 인덱스 추가 (또는 주석 해제) ***
// 학생 ID와 과목 조합으로 자주 검색하는 경우 (과목 필터링 시 사용)
chatSummarySchema.index({ student: 1, "subjects.subject": 1 });

// 일정 기간이 지난 summary 삭제 메소드 (기존과 동일)
chatSummarySchema.methods.removeOldSummaries = function (days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  this.subjects.forEach((subject) => {
    subject.summaries = subject.summaries.filter(
      (summary) => summary.createdAt >= cutoffDate
    );
  });

  // subjects 배열 자체가 비게 되면 해당 subject 객체를 배열에서 제거하는 로직 추가 (선택적)
  this.subjects = this.subjects.filter(
    (subject) => subject.summaries.length > 0
  );

  return this.save();
};

const ChatSummary = mongoose.model("ChatSummary", chatSummarySchema);

module.exports = ChatSummary;
