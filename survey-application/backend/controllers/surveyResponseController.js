const mongoose = require("mongoose");

const Question = require("../models/Question");
const SurveyResponse = require("../models/SurveyResponse");
const SurveyTemplate = require("../models/SurveyTemplate");
const idCardGeneratorService = require("../services/idCardGeneratorService");
const asyncHandler = require("../utils/asyncHandler");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const normalizeParticipantId = (req) => {
  const candidate =
    req.body?.participantId ||
    req.body?.studentId ||
    req.query?.participantId ||
    req.query?.studentId ||
    req.headers["x-participant-id"];

  return candidate && isValidId(candidate) ? String(candidate) : null;
};

const normalizeAnswers = (answers) => {
  if (!Array.isArray(answers)) return [];

  return answers
    .filter((answer) => answer && typeof answer.fieldName === "string")
    .map((answer) => ({
      fieldName: answer.fieldName.trim(),
      value: answer.value,
    }))
    .filter((answer) => answer.fieldName.length > 0);
};

const getMissingRequiredFields = (template, answers) => {
  if (!template || !Array.isArray(template.questions)) return [];

  const requiredKeys = template.questions
    .filter((question) => question?.required)
    .map((question) => String(question.fieldName || "").trim())
    .filter(Boolean);

  const provided = new Map(answers.map((answer) => [answer.fieldName, answer.value]));

  return requiredKeys.filter((key) => {
    if (!provided.has(key)) return true;

    const value = provided.get(key);
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
    );
  });
};

const getAnswerValue = (answers, fieldName) => {
  const found = answers.find((answer) => answer.fieldName === fieldName);
  return found?.value;
};

const asText = (value) => {
  if (value === undefined || value === null || typeof value === "object") return "";
  return String(value).trim();
};

const sanitizeFileValue = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  if (!value.dataUrl) return value;

  return {
    fileName: value.fileName || value.name || "uploaded-file",
    fileType: value.fileType || value.type || "",
    fileSize: value.fileSize || value.size || 0,
    imageUrl: value.imageUrl || "",
  };
};

const sanitizeFileAnswersForStorage = (answers) =>
  answers.map((answer) => ({
    ...answer,
    value: sanitizeFileValue(answer.value),
  }));

const normalizeQuestionReviews = (questionReviews) => {
  if (!Array.isArray(questionReviews)) return [];

  return questionReviews
    .filter((review) => review && isValidId(review.questionId))
    .map((review) => ({
      questionId: review.questionId,
      difficulty: review.difficulty || "Moderate",
      reviewText: String(review.reviewText || "").trim(),
    }));
};

const getActiveTemplate = async (examId, surveyType, surveyTemplateId) => {
  if (surveyTemplateId && isValidId(surveyTemplateId)) {
    const template = await SurveyTemplate.findOne({
      _id: surveyTemplateId,
      examId,
      surveyType,
      isActive: true,
    }).lean();

    if (template) return template;
  }

  return SurveyTemplate.findOne({ examId, surveyType, isActive: true }).lean();
};

const buildGetSurvey = (surveyType) =>
  asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const participantId = normalizeParticipantId(req);

    if (!isValidId(examId)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    if (participantId) {
      const existing = await SurveyResponse.findOne({
        examId,
        studentId: participantId,
        surveyType,
      })
        .select("_id submittedAt")
        .lean();

      if (existing) {
        return res.json({
          alreadySubmitted: true,
          submittedAt: existing.submittedAt,
        });
      }
    }

    const template = await SurveyTemplate.findOne({ examId, surveyType, isActive: true }).lean();

    let examQuestions = [];
    if (surveyType === "postExam" && template?.questionReviewConfig?.enabled) {
      examQuestions = await Question.find({ examId })
        .select("questionText questionType order")
        .sort({ order: 1, createdAt: 1 })
        .lean();
    }

    return res.json({
      alreadySubmitted: false,
      template: template || null,
      examQuestions,
    });
  });

const buildSubmitSurvey = (surveyType) =>
  asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const participantId = normalizeParticipantId(req);
    const { surveyTemplateId, answers, questionReviews } = req.body || {};

    if (!isValidId(examId)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    if (!participantId) {
      return res.status(400).json({
        message: "participantId is required for public survey submission",
      });
    }

    if (answers !== undefined && !Array.isArray(answers)) {
      return res.status(400).json({ message: "answers must be an array" });
    }

    const template = await getActiveTemplate(examId, surveyType, surveyTemplateId);
    if (!template) {
      return res.status(404).json({ message: "Active survey template not found" });
    }

    const normalizedAnswers = normalizeAnswers(answers);
    const missing = getMissingRequiredFields(template, normalizedAnswers);

    if (missing.length > 0) {
      return res.status(400).json({
        message: "Please answer all required questions",
        missing,
      });
    }

    const existing = await SurveyResponse.findOne({
      examId,
      studentId: participantId,
      surveyType,
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    let doc;
    try {
      doc = await SurveyResponse.create({
        examId,
        studentId: participantId,
        surveyType,
        surveyTemplateId: template._id,
        answers: normalizedAnswers,
        questionReviews: surveyType === "postExam" ? normalizeQuestionReviews(questionReviews) : [],
      });
    } catch (err) {
      if (err?.code === 11000) {
        doc = await SurveyResponse.findOne({ examId, studentId: participantId, surveyType });
        if (!doc) throw err;
        return res.status(200).json(doc);
      }
      throw err;
    }

    return res.status(201).json(doc);
  });

exports.getPreSurvey = buildGetSurvey("preExam");
exports.getPostSurvey = buildGetSurvey("postExam");
exports.submitPreSurvey = buildSubmitSurvey("preExam");
exports.submitPostSurvey = buildSubmitSurvey("postExam");

exports.getStandaloneSurvey = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  if (!isValidId(templateId)) {
    return res.status(400).json({ message: "Invalid template id" });
  }

  const template = await SurveyTemplate.findOne({
    _id: templateId,
    surveyType: "standalone",
    isActive: true,
  }).lean();

  if (!template) {
    return res.status(404).json({ message: "Survey template not found" });
  }

  return res.json({
    alreadySubmitted: false,
    template,
    examQuestions: [],
  });
});

exports.submitStandaloneSurvey = asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const { answers } = req.body || {};

  if (!isValidId(templateId)) {
    return res.status(400).json({ message: "Invalid template id" });
  }

  if (answers !== undefined && !Array.isArray(answers)) {
    return res.status(400).json({ message: "answers must be an array" });
  }

  const template = await SurveyTemplate.findOne({
    _id: templateId,
    surveyType: "standalone",
    isActive: true,
  }).lean();

  if (!template) {
    return res.status(404).json({ message: "Survey template not found" });
  }

  const normalizedAnswers = normalizeAnswers(answers);
  const missing = getMissingRequiredFields(template, normalizedAnswers);

  if (missing.length > 0) {
    return res.status(400).json({
      message: "Please answer all required questions",
      missing,
    });
  }

  const responseId = new mongoose.Types.ObjectId();
  const respondentObjectId = new mongoose.Types.ObjectId();
  const respondentName = asText(getAnswerValue(normalizedAnswers, "name"));
  const respondentEmail = asText(getAnswerValue(normalizedAnswers, "email"));

  let integrationResult = {
    status: idCardGeneratorService.isIdCardIntegrationEnabled(template) ? "pending" : "none",
    storedAnswers: sanitizeFileAnswersForStorage(normalizedAnswers),
    idCard: {},
  };
  let integrationError = "";

  if (idCardGeneratorService.isIdCardIntegrationEnabled(template)) {
    try {
      integrationResult = await idCardGeneratorService.createIdCardFromSurvey({
        template,
        responseId,
        answers: normalizedAnswers,
      });
    } catch (error) {
      integrationResult = {
        status: "failed",
        storedAnswers: sanitizeFileAnswersForStorage(normalizedAnswers),
        idCard: {},
      };
      integrationError = error.message || "ID-card generation failed";
    }
  }

  const doc = await SurveyResponse.create({
    _id: responseId,
    examId: null,
    studentId: respondentObjectId,
    surveyType: "standalone",
    surveyTemplateId: template._id,
    answers: integrationResult.storedAnswers,
    snapshotLabel: template.title,
    respondentKey: String(respondentObjectId),
    respondentName,
    respondentEmail,
    source: "public-form",
    integrationStatus: integrationResult.status,
    integrationError,
    idCard: integrationResult.idCard,
  });

  return res.status(201).json({
    message:
      integrationResult.status === "completed"
        ? "Response saved and ID card generated"
        : "Response saved",
    response: doc,
    idCard: integrationResult.idCard,
    integrationStatus: integrationResult.status,
    integrationError,
  });
});

exports.getStandaloneResponses = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  if (!isValidId(templateId)) {
    return res.status(400).json({ message: "Invalid template id" });
  }

  const template = await SurveyTemplate.findOne({
    _id: templateId,
    surveyType: "standalone",
  }).lean();

  if (!template) {
    return res.status(404).json({ message: "Survey template not found" });
  }

  const responses = await SurveyResponse.find({
    surveyTemplateId: template._id,
    surveyType: "standalone",
  })
    .sort({ submittedAt: -1 })
    .lean();

  const columns = [
    { fieldName: "submittedAt", label: "Timestamp", type: "datetime" },
    ...(template.questions || [])
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((question) => ({
        fieldName: question.fieldName,
        label: question.label,
        type: question.type,
      })),
    { fieldName: "idCard", label: "ID Card", type: "link" },
  ];

  return res.json({
    template,
    columns,
    responses,
    summary: {
      responseCount: responses.length,
      generatedCards: responses.filter(
        (response) => response.integrationStatus === "completed" && response.idCard?.generatedCardId
      ).length,
    },
  });
});
