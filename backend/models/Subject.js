  const mongoose = require('mongoose');
  const Schema = mongoose.Schema;

  const RatingSchema = new Schema({
    level: { 
      type: String, 
      required: true, 
      enum: ['상', '중', '하'] 
    },
    comments: [{ type: String }]
  });

  const UnitSchema = new Schema({
    name: { type: String, required: true },
    ratings: [RatingSchema]
  });

  const SubjectSchema = new Schema({
    name: { type: String, required: true },
    grade: { type: Number, required: true },
    semester: { type: String, required: true },
    units: [UnitSchema]
  });

  module.exports = mongoose.model('Subject', SubjectSchema);