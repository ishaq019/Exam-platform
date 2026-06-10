const path = require("path");
const { fork } = require("child_process");
const mongoose = require("mongoose");

const Assignment = require("../models/ExamAssignment");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const asyncHandler = require("../utils/asyncHandler");
const streamCsv = require("../utils/streamCsv");
const { evaluateQuestionAnswer } = require("../services/questionEvaluationService");

const reportRows = (examId) =>
  Attempt.aggregate([
    {
      $match: {
        examId: new mongoose.Types.ObjectId(examId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "studentId",
        foreignField: "_id",
        as: "student",
      },
    },
    {
      $unwind: "$student",
    },
    {
      $project: {
        studentName: "$student.name",
        email: "$student.email",
        attemptNumber: 1,
        score: 1,
        totalMarks: 1,
        status: 1,
        startedAt: 1,
        submittedAt: 1,
        timeTakenSeconds: 1,
        autoSubmitted: 1,
      },
    },
    {
      $sort: {
        studentName: 1,
        attemptNumber: 1,
      },
    },
  ]);

const getScoreBands = (rows) => {
  const bands = [
    { name: "0-39%", value: 0 },
    { name: "40-59%", value: 0 },
    { name: "60-79%", value: 0 },
    { name: "80-100%", value: 0 },
  ];

  rows.forEach((row) => {
    const score = Number(row.score) || 0;
    const totalMarks = Number(row.totalMarks) || 0;

    if (!totalMarks) return;

    const percentage = (score / totalMarks) * 100;

    if (percentage < 40) bands[0].value += 1;
    else if (percentage < 60) bands[1].value += 1;
    else if (percentage < 80) bands[2].value += 1;
    else bands[3].value += 1;
  });

  return bands;
};

const getQuestionAnalysis = async (examId) => {
  const [questions, attempts] = await Promise.all([
    Question.find({ examId })
      .select("questionText questionType options correctOption correctOptions correctAnswer acceptedAnswers marks difficulty")
      .sort({ createdAt: 1 })
      .lean(),

    Attempt.find({ examId }).select("answers").lean(),
  ]);

  const totalAttempts = attempts.length;

  return questions.map((question, index) => {
    let attended = 0;
    let correct = 0;
    let wrong = 0;
    let markedForReview = 0;
    let workAreaUsed = 0;

    attempts.forEach((attempt) => {
      const answer = (attempt.answers || []).find(
        (item) => String(item.questionId) === String(question._id)
      );

      if (!answer) return;

      if (answer.isMarkedForReview) markedForReview += 1;
      if (answer.workArea && answer.workArea.trim()) workAreaUsed += 1;

      const type = question.questionType;
      let hasAnswer = false;

      if (type === "multiSelect") {
        hasAnswer = Array.isArray(answer.selectedOptions) && answer.selectedOptions.length > 0;
      } else if (type === "oneWord" || type === "fillInTheBlank") {
        hasAnswer = typeof answer.textAnswer === "string" && answer.textAnswer.trim().length > 0;
      } else {
        hasAnswer = answer.selectedOption !== null && answer.selectedOption !== undefined && answer.selectedOption !== "";
      }

      if (!hasAnswer) return;

      attended += 1;

      const result = evaluateQuestionAnswer(question, answer);
      if (result.correct) correct += 1;
      else wrong += 1;
    });

    const skipped = Math.max(totalAttempts - attended, 0);

    const accuracyRate = attended
      ? Number(((correct / attended) * 100).toFixed(2))
      : 0;

    let performanceLabel = "Difficult / Needs Review";

    if (accuracyRate >= 80) {
      performanceLabel = "Easy / Strong";
    } else if (accuracyRate >= 50) {
      performanceLabel = "Moderate";
    }

    return {
      questionId: question._id,
      questionNo: index + 1,
      questionText: question.questionText,
      difficulty: question.difficulty || "medium",
      marks: question.marks || 1,

      totalAttempts,
      attended,
      correct,
      wrong,
      skipped,
      markedForReview,
      workAreaUsed,
      accuracyRate,
      performanceLabel,
    };
  });
};

exports.examReport = asyncHandler(async (req, res) => {
  const examId = req.params.examId;

  const [rows, assigned, questionAnalysis] = await Promise.all([
    reportRows(examId),
    Assignment.countDocuments({ examId }),
    getQuestionAnalysis(examId),
  ]);

  const scores = rows.map((row) => Number(row.score) || 0);

  const attempted = new Set(rows.map((row) => String(row.email))).size;
  const totalSubmittedAttempts = rows.length;
  const pending = Math.max(assigned - attempted, 0);

  const summary = {
    assigned,
    attempted,
    totalSubmittedAttempts,
    pending,
    highest: scores.length ? Math.max(...scores) : 0,
    lowest: scores.length ? Math.min(...scores) : 0,
    average: scores.length
      ? Number(
          (
            scores.reduce((total, score) => total + score, 0) / scores.length
          ).toFixed(2)
        )
      : 0,
  };

  const charts = {
    completion: [
      { name: "Assigned", value: assigned },
      { name: "Attempted", value: attempted },
      { name: "Pending", value: pending },
    ],

    scoreBands: getScoreBands(rows),

    questionAccuracy: questionAnalysis.map((item) => ({
      name: `Q${item.questionNo}`,
      accuracy: item.accuracyRate,
      attended: item.attended,
      skipped: item.skipped,
    })),
  };

  res.json({
    summary,
    rows,
    charts,
    questionAnalysis,
  });
});

exports.exportReport = asyncHandler(async (req, res) => {
  const rows = await reportRows(req.params.examId);

  const child = fork(path.join(__dirname, "../jobs/reportExportChild.js"));

  child.send(rows);

  child.on("message", (csv) => {
    streamCsv(res, csv, "exam-report.csv");
    child.kill();
  });
});