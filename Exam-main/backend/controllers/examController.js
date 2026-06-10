const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const Assignment = require("../models/ExamAssignment");
const asyncHandler = require("../utils/asyncHandler");

exports.createExam = asyncHandler(async (req, res) => {
  const surveyConfig = {
    preExamEnabled: Boolean(req.body?.surveyConfig?.preExamEnabled),
    postExamEnabled: Boolean(req.body?.surveyConfig?.postExamEnabled),
  };

  const exam = await Exam.create({
    ...req.body,
    surveyConfig,
    createdBy: req.user._id,
  });

  res.status(201).json(exam);
});

exports.getExams = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const [exams, total] = await Promise.all([
    Exam.find({ createdBy: req.user._id })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .select("title description duration startTime endTime status surveyConfig createdAt")
      .lean(),
    Exam.countDocuments({ createdBy: req.user._id })
  ]);
  
  res.json({
    data: exams,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});

exports.getExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id }).lean();
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  res.json(exam);
});

exports.updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!exam) return res.status(404).json({ message: "Exam not found" });
  res.json(exam);
});

exports.deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!exam) return res.status(404).json({ message: "Exam not found" });

  await Promise.all([
    Question.deleteMany({ examId: exam._id }),
    Attempt.deleteMany({ examId: exam._id }),
    Assignment.deleteMany({ examId: exam._id }),
  ]);

  await exam.deleteOne();

  res.json({ message: "Exam deleted" });
});
