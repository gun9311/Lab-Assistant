const express = require("express");
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  answerQuestion,
  updateQuestionStatus,
  getQnAStatistics,
} = require("../controllers/qnaController");
const auth = require("../middleware/auth");
const router = express.Router();

// === 교사 & 관리자 공통 ===

// 질문 목록 조회 (교사: 본인 질문만, 관리자: 전체)
router.get("/", auth(["teacher", "admin"]), getQuestions);

// 질문 상세 조회
router.get("/:id", auth(["teacher", "admin"]), getQuestionById);

// === 교사 전용 ===

// 질문 생성
router.post("/", auth(["teacher"]), createQuestion);

// 질문 수정 (답변 전에만)
router.put("/:id", auth(["teacher"]), updateQuestion);

// 질문 삭제 (답변 전에만)
router.delete("/:id", auth(["teacher"]), deleteQuestion);

// 교사가 자신의 질문을 "해결됨"으로 변경 (답변이 있을 때만)
router.patch("/:id/resolve", auth(["teacher"]), updateQuestionStatus);

// === 관리자 전용 ===

// 답변 작성/수정
router.post("/:id/answer", auth(["admin"]), answerQuestion);

// 질문 상태 변경 (관리자 전용)
router.patch("/:id/status", auth(["admin"]), updateQuestionStatus);

// QnA 통계 조회
router.get("/admin/statistics", auth(["admin"]), getQnAStatistics);

module.exports = router;
