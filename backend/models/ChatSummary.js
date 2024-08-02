const mongoose = require('mongoose');

const chatSummarySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjects: [
    {
      subject: { type: String, required: true },
      summaries: [
        {
          summary: { type: String, required: true },
          createdAt: { type: Date, default: Date.now }
        }
      ],
    }
  ],
});

// 일정 기간이 지난 summary 삭제
chatSummarySchema.methods.removeOldSummaries = function (days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  this.subjects.forEach(subject => {
    subject.summaries = subject.summaries.filter(summary => summary.createdAt >= cutoffDate);
  });

  return this.save();
};

const ChatSummary = mongoose.model('ChatSummary', chatSummarySchema);

module.exports = ChatSummary;
