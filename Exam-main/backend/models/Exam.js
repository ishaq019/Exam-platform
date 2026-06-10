const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    duration: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    surveyConfig: {
      preExamEnabled: { type: Boolean, default: false },
      postExamEnabled: { type: Boolean, default: false },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

examSchema.index({ createdBy: 1, status: 1 });
examSchema.index({ createdBy: 1, createdAt: -1 });
examSchema.index({ status: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model("Exam", examSchema);
