const path = require("path");
const { Worker } = require("worker_threads");

const Exam = require("../models/Exam");
const Question = require("../models/Question");
const Attempt = require("../models/Attempt");
const Assignment = require("../models/ExamAssignment");
const examEvents = require("../events/examEvents");
const asyncHandler = require("../utils/asyncHandler");
const { ADMIN_EMAIL, sendExamReportEmail } = require("../utils/mailService");

const TIMER_GRACE_SECONDS = 10;

const runScoreWorker = (questions, answers) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "../workers/scoreWorker.js"));

    worker.postMessage({ questions, answers });

    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Score worker stopped with exit code ${code}`));
      }
    });
  });

const getDeadline = (startedAt, durationMinutes, examEndTime) => {
  const durationDeadline = new Date(
    new Date(startedAt).getTime() + Number(durationMinutes) * 60 * 1000
  );

  const hardExamEnd = new Date(examEndTime);

  return durationDeadline < hardExamEnd ? durationDeadline : hardExamEnd;
};

const getRemainingSeconds = (deadlineAt) =>
  Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));

const checkAssigned = (examId, studentId) =>
  Assignment.findOne({ examId, studentId });

exports.assignedExams = asyncHandler(async (req, res) => {
  const items = await Assignment.find({ studentId: req.user._id })
    .select(
      "examId createdAt startedAt deadlineAt maxAttempts attemptsUsed"
    )
    .populate({
      path: "examId",
      select: "title description duration startTime endTime status surveyConfig createdAt",
    })
    .sort("-createdAt")
    .lean();

  const examIds = items
    .filter((item) => item.examId)
    .map((item) => item.examId._id);

  const attemptCounts = await Attempt.aggregate([
    {
      $match: {
        studentId: req.user._id,
        examId: { $in: examIds },
      },
    },
    {
      $group: {
        _id: "$examId",
        attemptsUsed: { $sum: 1 },
      },
    },
  ]);

  const attemptCountMap = new Map(
    attemptCounts.map((item) => [String(item._id), item.attemptsUsed])
  );

  res.json(
    items
      .filter((item) => item.examId)
      .map((item) => {
        const attemptsUsed = attemptCountMap.get(String(item.examId._id)) || 0;
        const maxAttempts = Number(item.maxAttempts) || 1;

        return {
          ...item.examId,
          startedAt: item.startedAt,
          deadlineAt: item.deadlineAt,
          maxAttempts,
          attemptsUsed,
          remainingAttempts: Math.max(maxAttempts - attemptsUsed, 0),
        };
      })
  );
});

exports.startExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const assignment = await checkAssigned(examId, req.user._id);

  if (!assignment) {
    return res.status(403).json({ message: "Exam not assigned" });
  }

  const previousAttempts = await Attempt.countDocuments({
    examId,
    studentId: req.user._id,
  });

  const maxAttempts = Number(assignment.maxAttempts) || 1;

  if (previousAttempts >= maxAttempts) {
    return res.status(400).json({
      message: `Attempt limit reached. You are allowed only ${maxAttempts} attempt(s).`,
    });
  }

  const [exam, questions] = await Promise.all([
    Exam.findById(examId)
      .select("title description duration startTime endTime status surveyConfig createdAt")
      .lean(),

    Question.find({ examId })
      .select("-correctOption -correctOptions -correctAnswer -acceptedAnswers")
      .sort({ order: 1, createdAt: 1 })
      .lean(),
  ]);

  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const now = new Date();

 const examStart = new Date(exam.startTime);
const examEnd = new Date(exam.endTime);

if (Number.isNaN(examStart.getTime()) || Number.isNaN(examEnd.getTime())) {
  return res.status(400).json({ message: "Invalid exam schedule" });
}

if (now < examStart || now > examEnd) {
  return res.status(400).json({
    message: "Exam is not active now",
    serverTime: now.toISOString(),
    startTime: examStart.toISOString(),
    endTime: examEnd.toISOString(),
  });
}
  const deadlineExpired =
    assignment.deadlineAt && now > new Date(assignment.deadlineAt);

  if (!assignment.startedAt || deadlineExpired) {
    if (deadlineExpired && previousAttempts >= maxAttempts) {
      return res.status(400).json({
        message: `Attempt limit reached. You are allowed only ${maxAttempts} attempt(s).`,
      });
    }

    assignment.startedAt = now;
    assignment.deadlineAt = getDeadline(now, exam.duration, exam.endTime);
    await assignment.save();
  }

  res.json({
    exam,
    questions,
    startedAt: assignment.startedAt,
    deadlineAt: assignment.deadlineAt,
    serverTime: now,
    remainingSeconds: getRemainingSeconds(assignment.deadlineAt),
    attemptInfo: {
      maxAttempts,
      attemptsUsed: previousAttempts,
      remainingAttempts: Math.max(maxAttempts - previousAttempts, 0),
      currentAttempt: previousAttempts + 1,
    },
  });
});

exports.submitExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const assignment = await checkAssigned(examId, req.user._id);

  if (!assignment) {
    return res.status(403).json({ message: "Exam not assigned" });
  }

  const [exam, previousAttempts] = await Promise.all([
    Exam.findById(examId).select("title duration endTime surveyConfig").lean(),

    Attempt.countDocuments({
      examId,
      studentId: req.user._id,
    }),
  ]);

  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const maxAttempts = Number(assignment.maxAttempts) || 1;

  if (previousAttempts >= maxAttempts) {
    return res.status(400).json({
      message: `Attempt limit reached. You are allowed only ${maxAttempts} attempt(s).`,
    });
  }

  const attemptNumber = previousAttempts + 1;

  const now = new Date();
  const startedAt = assignment.startedAt || now;

  const deadlineAt =
    assignment.deadlineAt || getDeadline(startedAt, exam.duration, exam.endTime);

  const graceDeadline = new Date(
    new Date(deadlineAt).getTime() + TIMER_GRACE_SECONDS * 1000
  );

  if (!assignment.startedAt || !assignment.deadlineAt) {
    assignment.startedAt = startedAt;
    assignment.deadlineAt = deadlineAt;
    await assignment.save();
  }

  if (now > graceDeadline) {
    return res.status(400).json({
      message: "Exam time is over. Submission rejected.",
    });
  }

  // Ensure consistent ordering for scoring as well
  // (order may be unset for legacy questions, so fall back to createdAt)
  const questions = await Question.find({ examId }).sort({ order: 1, createdAt: 1 }).lean();

  const questionIds = new Set(questions.map((question) => String(question._id)));

  const normalizedAnswers = (req.body.answers || [])
    .filter((answer) => questionIds.has(String(answer.questionId)))
    .map((answer) => ({
      questionId: answer.questionId,

      selectedOption:
        answer.selectedOption === null ||
        answer.selectedOption === undefined ||
        answer.selectedOption === ""
          ? null
          : answer.selectedOption,

      selectedOptions: Array.isArray(answer.selectedOptions)
        ? answer.selectedOptions.map(Number)
        : [],

      textAnswer:
        typeof answer.textAnswer === "string" ? answer.textAnswer.trim() : "",

      isMarkedForReview: Boolean(answer.isMarkedForReview),

      workArea:
        typeof answer.workArea === "string" ? answer.workArea.trim() : "",
    }));

  const serializedQuestions = questions.map((question) => ({
    ...question,
    _id: String(question._id),
    correctOption:
      question.correctOption === undefined || question.correctOption === null
        ? null
        : Number(question.correctOption),
    correctOptions: Array.isArray(question.correctOptions)
      ? question.correctOptions.map(Number)
      : [],
    correctAnswer: question.correctAnswer || "",
    acceptedAnswers: Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers
      : [],
    marks: Number(question.marks) || 0,
  }));

  const result = await runScoreWorker(serializedQuestions, normalizedAnswers);

  let attempt;
  try {
    attempt = await Attempt.create({
      examId,
      studentId: req.user._id,
      attemptNumber,
      answers: normalizedAnswers,
      score: result.score,
      totalMarks: result.totalMarks,
      startedAt,
      deadlineAt,
      submittedAt: now,
      timeTakenSeconds: Math.max(
        0,
        Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000)
      ),
      autoSubmitted: Boolean(req.body.autoSubmitted),
    });
  } catch (err) {
    if (err.code === 11000) {
      // Attempt already submitted (double-submit / network retry) – return latest existing
      attempt = await Attempt.findOne({ examId, studentId: req.user._id })
        .sort({ createdAt: -1 })
        .lean();
      if (!attempt) {
        // Fallback to trying to find by attemptNumber, then rethrow if not found
        attempt = await Attempt.findOne({
          examId,
          studentId: req.user._id,
          attemptNumber,
        }).lean();
        if (!attempt) throw err;
      }
    } else {
      throw err;
    }
  }

  await Assignment.updateOne(
    { examId, studentId: req.user._id },
    {
      $set: {
        attemptsUsed: attemptNumber,
        startedAt: null,
        deadlineAt: null,
      },
    }
  );

  examEvents.emit("examSubmitted", {
    examId,
    studentId: req.user._id,
    attemptNumber,
    score: result.score,
  });

  void Promise.allSettled([
    sendExamReportEmail({
      to: req.user.email,
      recipientName: req.user.name,
      examTitle: exam.title,
      studentName: req.user.name,
      studentEmail: req.user.email,
      score: result.score,
      totalMarks: result.totalMarks,
      attemptNumber,
      submittedAt: now,
      role: "student",
    }),
    ADMIN_EMAIL && ADMIN_EMAIL !== req.user.email
      ? sendExamReportEmail({
          to: ADMIN_EMAIL,
          recipientName: "Administrator",
          examTitle: exam.title,
          studentName: req.user.name,
          studentEmail: req.user.email,
          score: result.score,
          totalMarks: result.totalMarks,
          attemptNumber,
          submittedAt: now,
          role: "admin",
        })
      : Promise.resolve(true),
  ]);

  const attemptPayload = typeof attempt.toObject === "function" ? attempt.toObject() : attempt;

  res.status(201).json({
    ...attemptPayload,
    exam: {
      _id: examId,
      surveyConfig: exam.surveyConfig || {},
    },
    nextStep: {
      postSurveyRequired: Boolean(exam.surveyConfig?.postExamEnabled),
    },
  });
});