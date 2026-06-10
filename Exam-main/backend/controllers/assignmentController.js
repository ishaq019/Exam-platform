const mongoose = require("mongoose");

const ExamAssignment = require("../models/ExamAssignment");
const Attempt = require("../models/Attempt");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

exports.getStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: "student" })
    .select("name email role createdAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json(students);
});

exports.assignStudents = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return res.status(400).json({ message: "Invalid exam id" });
  }

  const studentIds = [
    ...new Set((req.body.studentIds || []).map((id) => String(id))),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  const maxAttempts = Math.max(Number(req.body.maxAttempts) || 1, 1);

  if (!studentIds.length) {
    return res.status(400).json({
      message: "Please select at least one valid student.",
    });
  }

  const attemptCounts = await Attempt.aggregate([
    {
      $match: {
        examId: toObjectId(examId),
        studentId: {
          $in: studentIds.map((studentId) => toObjectId(studentId)),
        },
      },
    },
    {
      $group: {
        _id: "$studentId",
        attemptsUsed: { $sum: 1 },
      },
    },
  ]);

  const attemptCountMap = new Map(
    attemptCounts.map((item) => [String(item._id), item.attemptsUsed])
  );

  const docs = [];
  const skippedStudentIds = [];

  studentIds.forEach((studentId) => {
    const attemptsUsed = attemptCountMap.get(studentId) || 0;

    if (attemptsUsed >= maxAttempts) {
      skippedStudentIds.push(studentId);
      return;
    }

    docs.push({
      examId,
      studentId,
      assignedBy: req.user._id,
      maxAttempts,
      attemptsUsed,
    });
  });

  if (docs.length) {
    await ExamAssignment.bulkWrite(
      docs.map((doc) => ({
        updateOne: {
          filter: {
            examId: doc.examId,
            studentId: doc.studentId,
          },
          update: {
            $setOnInsert: {
              examId: doc.examId,
              studentId: doc.studentId,
              assignedBy: doc.assignedBy,
              startedAt: null,
              deadlineAt: null,
            },
            $set: {
              maxAttempts: doc.maxAttempts,
              attemptsUsed: doc.attemptsUsed,
            },
          },
          upsert: true,
        },
      }))
    );
  }

  res.status(200).json({
    message: docs.length
      ? "Students assigned successfully."
      : "No students assigned. Selected students may have already completed allowed attempts.",
    assignedCount: docs.length,
    skippedCount: skippedStudentIds.length,
    skippedStudentIds,
    maxAttempts,
  });
});

exports.getAssignedStudents = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return res.status(400).json({ message: "Invalid exam id" });
  }

  const assignments = await ExamAssignment.find({ examId })
    .populate({
      path: "studentId",
      select: "name email role",
    })
    .sort({ createdAt: -1 })
    .lean();

  const validAssignments = assignments.filter((item) => item.studentId);

  const studentIds = validAssignments.map((item) => item.studentId._id);

  const attemptCounts = await Attempt.aggregate([
    {
      $match: {
        examId: toObjectId(examId),
        studentId: { $in: studentIds },
      },
    },
    {
      $group: {
        _id: "$studentId",
        attemptsUsed: { $sum: 1 },
      },
    },
  ]);

  const attemptCountMap = new Map(
    attemptCounts.map((item) => [String(item._id), item.attemptsUsed])
  );

  const result = validAssignments.map((assignment) => {
    const attemptsUsed =
      attemptCountMap.get(String(assignment.studentId._id)) || 0;

    const maxAttempts = Number(assignment.maxAttempts) || 1;

    return {
      ...assignment,
      attemptsUsed,
      remainingAttempts: Math.max(maxAttempts - attemptsUsed, 0),
    };
  });

  res.json(result);
});