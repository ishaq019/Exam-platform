const express = require("express");
const router = express.Router();
const controller = require("../controllers/surveyReportController");

// Public report endpoint for external Survey app integration.
router.get("/admin/exams/:examId/report", controller.getReport);

module.exports = router;
