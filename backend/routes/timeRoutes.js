const express = require("express");
const auth = require("../middleware/auth"); // 기본 인증 미들웨어
const timeController = require("../controllers/timeController");

const router = express.Router();

// 현재 서비스 이용 가능 시간대인지 확인하는 엔드포인트
// 로그인한 사용자만 접근 가능 (역할 제한 없음)
router.get("/status", auth(), timeController.getServiceTimeStatus);

module.exports = router;
