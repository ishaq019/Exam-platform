const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },

    attemptsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },

    startedAt: Date,
    deadlineAt: Date,
  },
  { timestamps: true }
);

assignmentSchema.index({ examId: 1, studentId: 1 }, { unique: true });
assignmentSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model("ExamAssignment", assignmentSchema);