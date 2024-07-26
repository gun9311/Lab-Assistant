const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;