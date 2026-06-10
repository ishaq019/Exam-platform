const express = require("express");
const router = express.Router();
const controller = require("../controllers/surveyResponseController");
const validate = require("../middleware/validateRequest");
const {
  surveyResponseValidator,
  standaloneSurveyResponseValidator,
} = require("../validators/surveyResponseValidator");

// Public student survey routes. The Quiz app may pass participantId/studentId in query/body,
// but the Survey app does not require JWT authentication.
router.get("/student/exams/:examId/pre", controller.getPreSurvey);
router.get("/student/exams/:examId/post", controller.getPostSurvey);
router.post("/student/exams/:examId/pre", surveyResponseValidator, validate, controller.submitPreSurvey);
router.post("/student/exams/:examId/post", surveyResponseValidator, validate, controller.submitPostSurvey);

router.get("/public/templates/:templateId", controller.getStandaloneSurvey);
router.post(
  "/public/templates/:templateId/responses",
  standaloneSurveyResponseValidator,
  validate,
  controller.submitStandaloneSurvey
);
router.get("/admin/templates/:templateId/responses", controller.getStandaloneResponses);

module.exports = router;
