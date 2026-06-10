const Exam = require("../models/Exam");
const asyncHandler = require("../utils/asyncHandler");
const surveyReportService = require("../services/surveyReportService");

exports.getReport = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const exam = await Exam.findById(examId).select("title").lean();
  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  const report = await surveyReportService.getSurveyReport(examId);
  return res.json({ success: true, data: report });
});
