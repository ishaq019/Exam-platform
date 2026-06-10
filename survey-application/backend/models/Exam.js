const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {},
  {
    strict: false,
    collection: 'exams',
  }
);

module.exports = mongoose.model('Exam', examSchema);