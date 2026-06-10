const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ["multipleChoice", "multiSelect", "oneWord", "fillInTheBlank"],
    default: "multipleChoice",
  },
  options: [{ type: String }],
  correctOption: { type: Number },
  correctOptions: [{ type: Number }],
  correctAnswer: { type: String },
  acceptedAnswers: [{ type: String }],
  explanation: { type: String },
  marks: { type: Number, default: 1 },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
  order: { type: Number, default: 0 },
}, { timestamps: true });

QuestionSchema.index({ examId: 1 });
QuestionSchema.index({ examId: 1, order: 1 });
QuestionSchema.index({ examId: 1, createdAt: -1 });

module.exports = mongoose.model('Question', QuestionSchema);
