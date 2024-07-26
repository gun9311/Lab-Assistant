const express = require('express');
const { saveChatSummary } = require('../controllers/chatbotController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/save-summary', auth(), saveChatSummary);

module.exports = router;
