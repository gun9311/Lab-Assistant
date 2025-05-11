const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// 세션 내에 저장될 질문 스냅샷을 위한 스키마 정의
const QuestionSnapshotSchema = new Schema({
  originalQuestionId: { type: mongoose.Schema.Types.ObjectId }, // 원본 KahootQuizContent.questions의 _id (참조용, 선택적)
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ["multiple-choice", "true-false"],
    required: true,
  },
  options: [
    {
      text: { type: String },
      imageUrl: { type: String },
      // 스냅샷 시점의 옵션 _id도 저장하고 싶다면 추가 가능
      // originalOptionId: { type: mongoose.Schema.Types.ObjectId }
    },
  ],
  correctAnswer: { type: String, required: true }, // 정답 옵션의 인덱스 또는 값 (원본 스키마와 동일하게 유지)
  timeLimit: { type: Number, default: 30 },
  imageUrl: { type: String },
  // 여기에 추가적으로 스냅샷 시점에 필요한 Question 관련 필드가 있다면 포함
});

const KahootQuizSessionSchema = new Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  pin: { type: String, required: true, unique: true }, // 세션 식별용 PIN
  startedAt: { type: Date, default: Date.now }, // 세션 시작 시간

  // 원본 퀴즈의 메타데이터 스냅샷
  grade: { type: Number, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  unit: { type: String, required: true },
  // originalQuizImageUrl: { type: String }, // 필요시

  // 사용된 질문들의 스냅샷 (가장 중요)
  questionsSnapshot: [QuestionSnapshotSchema],

  // (선택적) 세션 시작 시 팀 모드 설정 및 팀 구성 정보
  isTeamMode: { type: Boolean, default: false },
  initialTeams: [
    // 필드명 변경 제안
    {
      teamName: { type: String, required: true },
      memberStudentIds: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      ],
    },
  ],

  // (선택적) 세션 시작 시점에 참여를 "시도"했거나 "초대된" 학생 ID 목록 (만약 필요하다면)
  // initialParticipantStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
});

module.exports = mongoose.model("KahootQuizSession", KahootQuizSessionSchema);
