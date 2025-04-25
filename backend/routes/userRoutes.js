const express = require("express");
const {
  getStudents,
  getProfile,
  updateProfile,
  deleteProfile,
  getChatUsage,
} = require("../controllers/userController");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/teacher/students", auth("teacher"), getStudents);
router.get("/profile", auth(["student", "teacher"]), getProfile);
router.put("/profile", auth(["student", "teacher"]), updateProfile);
router.delete("/profile", auth(["student", "teacher"]), deleteProfile);
router.get("/chat-usage", auth("student"), getChatUsage);

module.exports = router;
