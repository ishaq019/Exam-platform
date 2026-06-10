const Question = require("../models/Question");
const asyncHandler = require("../utils/asyncHandler");

const normalizeText = (value) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase();

const normalizeQuestionPayload = (payload) => {
  const next = { ...payload };

  if (Array.isArray(next.options)) {
    next.options = next.options.map((option) => option.toString().trim());
  }

  if (Array.isArray(next.acceptedAnswers)) {
    next.acceptedAnswers = [...new Set(
      next.acceptedAnswers
        .map((answer) => normalizeText(answer))
        .filter(Boolean)
    )];
  }

  if (typeof next.correctAnswer === "string") {
    next.correctAnswer = normalizeText(next.correctAnswer);
  }

  if (Array.isArray(next.correctOptions)) {
    next.correctOptions = next.correctOptions
      .map((option) => Number(option))
      .filter((option) => Number.isInteger(option));
  }

  if (next.correctOption !== undefined && next.correctOption !== null && next.correctOption !== "") {
    next.correctOption = Number(next.correctOption);
  }

  return next;
};

exports.addQuestion = asyncHandler(async (req, res) => {
  const currentMaxOrder = await Question.findOne({ examId: req.params.examId })
    .sort({ order: -1, createdAt: -1 })
    .select("order")
    .lean();

  const question = await Question.create({
    ...normalizeQuestionPayload(req.body),
    examId: req.params.examId,
    order:
      Number.isInteger(req.body?.order) || req.body?.order === 0
        ? Number(req.body.order)
        : (currentMaxOrder?.order ?? -1) + 1,
  });
  res.status(201).json(question);
});

exports.getQuestions = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [questions, total] = await Promise.all([
    Question.find({ examId: req.params.examId })
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .select("-explanation")
      .lean(),
    Question.countDocuments({ examId: req.params.examId })
  ]);
  
  res.json({
    data: questions,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  });
});

exports.updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findByIdAndUpdate(req.params.id, normalizeQuestionPayload(req.body), {
    new: true,
    runValidators: true,
  });
  if (!question) return res.status(404).json({ message: "Question not found" });
  res.json(question);
});

exports.deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findByIdAndDelete(req.params.id);
  if (!question) return res.status(404).json({ message: "Question not found" });
  res.json({ message: "Question deleted" });
});

exports.reorderQuestions = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { questionIds } = req.body;

  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ message: "questionIds array is required" });
  }

  const bulkOps = questionIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, examId },
      update: { $set: { order: index } },
    },
  }));

  await Question.bulkWrite(bulkOps);

  res.json({ message: "Order updated" });
});
