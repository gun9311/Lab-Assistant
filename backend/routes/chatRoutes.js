const express = require("express");
const auth = require("../middleware/auth");
const { getChatSummaries } = require("../controllers/chatController");

const router = express.Router();

router.get("/summary/:studentId", auth("teacher"), getChatSummaries);

module.exports = router;
