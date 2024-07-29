const ChatSummary = require('../models/ChatSummary');

const getChatSummaries = async (req, res) => {
  try {
    const { studentId } = req.params;
    const chatSummaries = await ChatSummary.find({ student: studentId });
    res.json(chatSummaries);
  } catch (error) {
    res.status(500).send({ error: 'Error fetching chat summaries' });
  }
};

module.exports = {
  getChatSummaries,
};
