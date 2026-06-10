const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    selectedOption: { type: Number, default: null },
    selectedOptions: [{ type: Number }],
    textAnswer: { type: String, default: "" },
    isMarkedForReview: { type: Boolean, default: false },
    workArea: { type: String, default: "" },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [answerSchema],

    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    status: { type: String, enum: ["submitted"], default: "submitted" },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },

    startedAt: Date,
    deadlineAt: Date,
    submittedAt: { type: Date, default: Date.now },
    timeTakenSeconds: { type: Number, default: 0 },
    autoSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

attemptSchema.index({ examId: 1, studentId: 1 });
attemptSchema.index({ examId: 1, score: -1 });
attemptSchema.index(
  { examId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true }
);
attemptSchema.index({ studentId: 1, createdAt: -1 });
attemptSchema.index({ examId: 1, "answers.questionId": 1 });

module.exports = mongoose.model("Attempt", attemptSchema);