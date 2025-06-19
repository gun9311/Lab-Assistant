const mongoose = require("mongoose");

const qnaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      enum: ["기술문제", "계정문제", "기능문의", "퀴즈관련", "기타"],
      default: "기타",
    },
    priority: {
      type: String,
      required: true,
      enum: ["낮음", "보통", "높음", "긴급"],
      default: "보통",
    },
    status: {
      type: String,
      required: true,
      enum: ["대기중", "답변완료", "해결됨"],
      default: "대기중",
    },
    // 작성자 정보 (Teacher)
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorSchool: {
      type: String,
      required: true,
    },
    // 답변 정보
    answer: {
      type: String,
      maxlength: 5000,
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    answeredAt: {
      type: Date,
    },
    // 기타 설정
    isPrivate: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: String, // S3 file URLs
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// --- 인덱스 추가 ---
// 작성자별 질문 조회 (교사가 자신의 질문 목록을 볼 때)
qnaSchema.index({ author: 1, createdAt: -1 });

// 상태별 필터링 (관리자가 상태별로 질문을 관리할 때)
qnaSchema.index({ status: 1, createdAt: -1 });

// 카테고리별 필터링
qnaSchema.index({ category: 1, createdAt: -1 });

// 우선순위별 정렬
qnaSchema.index({ priority: 1, createdAt: -1 });

// 학교별 조회 (관리자가 학교별 통계를 볼 때)
qnaSchema.index({ authorSchool: 1, createdAt: -1 });

// 답변 여부별 조회 (미답변 질문 조회)
qnaSchema.index({ answeredBy: 1, status: 1 });

// 제목 검색을 위한 텍스트 인덱스
qnaSchema.index({ title: "text", content: "text" });

const QnA = mongoose.model("QnA", qnaSchema);

module.exports = QnA;
