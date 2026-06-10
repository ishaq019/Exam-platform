const express = require("express");

const {
  createSurveyTemplate,
  getSurveyTemplates,
  createDefaultTemplates,
  getSurveyTemplateById,
  getTemplatesByExam,
  removeTemplateConfiguration,
  updateTemplate,
  replaceExamSurveyTemplate,
} = require("../controllers/surveyTemplateController");

const validate = require("../middleware/validateRequest");
const surveyTemplateValidator = require("../validators/surveyTemplateValidator");

const router = express.Router();

router
  .route("/")
  .get(getSurveyTemplates)
  .post(surveyTemplateValidator, validate, createSurveyTemplate);

router.get("/exams/:examId", getTemplatesByExam);
router.post("/exams/:examId/defaults", createDefaultTemplates);

router.post("/exams/:examId/replace", replaceExamSurveyTemplate);

router.get("/:templateId", getSurveyTemplateById);

router
  .route("/:templateId")
  .put(surveyTemplateValidator, validate, updateTemplate)
  .delete(removeTemplateConfiguration);

module.exports = router;
