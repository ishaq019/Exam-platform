const mongoose = require("mongoose");

const SurveyTemplate = require("../models/SurveyTemplate");
const Exam = require("../models/Exam");
const asyncHandler = require("../utils/asyncHandler");
const { createDefaultTemplatesForExam } = require("../services/surveyTemplateService");

const isValidId = (value) => mongoose.Types.ObjectId.isValid(String(value));

const getExamOr404 = async (examId) => {
  if (!examId || !isValidId(examId)) {
    return {
      found: false,
      status: 400,
      message: "Invalid exam id",
    };
  }

  const exam = await Exam.findById(examId).select("_id title createdBy").lean();

  if (!exam) {
    return {
      found: false,
      status: 404,
      message: "Exam not found",
    };
  }

  return { found: true, exam };
};

const syncExamSurveyConfig = async (examId) => {
  if (!examId || !isValidId(examId)) {
    return null;
  }

  const activeTemplates = await SurveyTemplate.find({
    examId,
    isActive: true,
  })
    .select("surveyType")
    .lean();

  const surveyConfig = {
    preExamEnabled: activeTemplates.some((template) => template.surveyType === "preExam"),
    postExamEnabled: activeTemplates.some((template) => template.surveyType === "postExam"),
  };

  await Exam.findByIdAndUpdate(examId, {
    $set: { surveyConfig },
  });

  return surveyConfig;
};

const normalizeFieldName = (value, fallback) => {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return clean || fallback;
};

const normalizeQuestions = (questions = []) => {
  if (!Array.isArray(questions)) return [];

  const usedNames = new Set();

  return questions.map((question, index) => {
    const type = question.type === "paragraph" ? "textarea" : question.type || "text";

    let fieldName = normalizeFieldName(question.fieldName, `question_${index + 1}`);

    if (usedNames.has(fieldName)) {
      fieldName = `${fieldName}_${index + 1}`;
    }

    usedNames.add(fieldName);

    const label = String(question.label || "").trim();

    if (!label) {
      throw new Error(`Question ${index + 1} label is required`);
    }

    const normalized = {
      label,
      fieldName,
      type,
      required: Boolean(question.required),
      placeholder: String(question.placeholder || ""),
      helpText: String(question.helpText || ""),
      order: index,
      options: [],
      config: question.config || {},
    };

    if (["singleChoice", "multiSelect"].includes(type)) {
      normalized.options = (question.options || [])
        .map((option) => String(option || "").trim())
        .filter(Boolean);

      if (normalized.options.length < 2) {
        throw new Error(`Question ${index + 1} must have at least two options`);
      }
    }

    if (type === "rating") {
      const min = Number(question.config?.min ?? 1);
      const max = Number(question.config?.max ?? 5);
      const step = Number(question.config?.step ?? 1);

      if (Number.isNaN(min) || Number.isNaN(max) || min >= max) {
        throw new Error(`Question ${index + 1} has invalid rating config`);
      }

      normalized.config = { min, max, step };
    }

    return normalized;
  });
};

const normalizeIdCardIntegration = (integration = {}) => {
  const idCardGenerator = integration?.idCardGenerator || {};
  const enabled = Boolean(idCardGenerator.enabled);

  return {
    idCardGenerator: {
      enabled,
      templateId: String(
        idCardGenerator.templateId ||
          process.env.ID_CARD_GENERATOR_TEMPLATE_ID ||
          "6a20197fc3242cca3fcd19ff"
      ).trim(),
      apiBaseUrl: String(
        idCardGenerator.apiBaseUrl ||
          process.env.ID_CARD_GENERATOR_API_URL ||
          "https://id-generator-backend-jet.vercel.app/api"
      ).trim(),
      webBaseUrl: String(
        idCardGenerator.webBaseUrl ||
          process.env.ID_CARD_GENERATOR_WEB_URL ||
          "https://syedishaq.me/ID-Generator"
      ).trim(),
      source: String(idCardGenerator.source || "google-form").trim(),
      qrData: String(idCardGenerator.qrData || "STATIC_DIGIVAL_QR").trim(),
      fieldMap: {
        name: "name",
        email: "email",
        photo: "photo",
        employeeId: "employeeId",
        bloodGroup: "bloodGroup",
        phone: "phone",
        ...(idCardGenerator.fieldMap || {}),
      },
    },
  };
};

exports.getSurveyTemplates = asyncHandler(async (req, res) => {
  const { surveyType, examId, activeOnly = "true" } = req.query;

  const filter = {};

  if (activeOnly !== "false") {
    filter.isActive = true;
  }

  if (surveyType) {
    filter.surveyType = surveyType;
  }

  if (examId) {
    if (!isValidId(examId)) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    filter.examId = examId;
  }

  const templates = await SurveyTemplate.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return res.json(templates);
});

exports.getSurveyTemplateById = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  if (!isValidId(templateId)) {
    return res.status(400).json({ message: "Invalid template id" });
  }

  const template = await SurveyTemplate.findById(templateId).lean();

  if (!template || !template.isActive) {
    return res.status(404).json({ message: "Survey template not found" });
  }

  return res.json(template);
});

exports.createSurveyTemplate = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    surveyType,
    examId,
    questions = [],
    questionReviewConfig,
    isDefault = false,
    integration,
  } = req.body || {};

  const cleanTitle = String(title || "").trim();

  if (!cleanTitle) {
    return res.status(400).json({ message: "Survey title is required" });
  }

  const hasExam = Boolean(examId);
  const finalSurveyType = hasExam ? surveyType || "preExam" : surveyType || "standalone";

  if (!["preExam", "postExam", "standalone"].includes(finalSurveyType)) {
    return res.status(400).json({
      message: "surveyType must be preExam, postExam, or standalone",
    });
  }

  if (finalSurveyType === "standalone" && hasExam) {
    return res.status(400).json({
      message: "Standalone surveys must not have examId",
    });
  }

  if (finalSurveyType !== "standalone" && !hasExam) {
    return res.status(400).json({
      message: "examId is required for preExam and postExam surveys",
    });
  }

  let exam = null;

  if (hasExam) {
    const examCheck = await getExamOr404(examId);

    if (!examCheck.found) {
      return res.status(examCheck.status).json({ message: examCheck.message });
    }

    exam = examCheck.exam;
  }

  let normalizedQuestions;

  try {
    normalizedQuestions = normalizeQuestions(questions);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const template = await SurveyTemplate.create({
    examId: hasExam ? examId : null,
    surveyType: finalSurveyType,
    title: cleanTitle,
    description: String(description || "").trim(),
    isDefault: Boolean(isDefault),
    isActive: true,
    questions: normalizedQuestions,
    questionReviewConfig: questionReviewConfig || {},
    integration: normalizeIdCardIntegration(integration),
    createdBy: exam?.createdBy || null,
  });

  const surveyConfig = hasExam ? await syncExamSurveyConfig(examId) : null;

  return res.status(201).json({
    message: "Survey template created successfully",
    template,
    surveyConfig,
  });
});

exports.getTemplatesByExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const examCheck = await getExamOr404(examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  const templates = await SurveyTemplate.find({
    examId,
    isActive: true,
  })
    .sort({ surveyType: 1, createdAt: 1 })
    .lean();

  return res.json(templates);
});

exports.createDefaultTemplates = asyncHandler(async (req, res) => {
  const { examId } = req.params;

  const examCheck = await getExamOr404(examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  const preExamEnabled = req.body.preExamEnabled !== false;
  const postExamEnabled = req.body.postExamEnabled !== false;

  const templates = await createDefaultTemplatesForExam(examId, examCheck.exam.createdBy, {
    preExamEnabled,
    postExamEnabled,
  });

  const surveyConfig = await syncExamSurveyConfig(examId);

  return res.status(201).json({
    message: "Survey templates created successfully",
    templates,
    surveyConfig,
  });
});

exports.updateTemplate = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  if (!isValidId(templateId)) {
    return res.status(400).json({ message: "Invalid template id" });
  }

  const template = await SurveyTemplate.findById(templateId);

  if (!template) {
    return res.status(404).json({
      message: "Survey template not found",
    });
  }

  if (template.examId) {
    const examCheck = await getExamOr404(template.examId);

    if (!examCheck.found) {
      return res.status(examCheck.status).json({ message: examCheck.message });
    }
  }

  if (req.body.title !== undefined) {
    const cleanTitle = String(req.body.title || "").trim();

    if (!cleanTitle) {
      return res.status(400).json({ message: "Survey title is required" });
    }

    template.title = cleanTitle;
  }

  if (req.body.description !== undefined) {
    template.description = String(req.body.description || "").trim();
  }

  if (Array.isArray(req.body.questions)) {
    try {
      template.questions = normalizeQuestions(req.body.questions);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (req.body.questionReviewConfig !== undefined) {
    template.questionReviewConfig = req.body.questionReviewConfig || {};
  }

  if (req.body.integration !== undefined) {
    template.integration = normalizeIdCardIntegration(req.body.integration);
  }

  if (typeof req.body.isActive === "boolean") {
    template.isActive = req.body.isActive;
  }

  const updatedTemplate = await template.save();
  const surveyConfig = template.examId ? await syncExamSurveyConfig(template.examId) : null;

  return res.json({
    message: "Survey template updated successfully",
    template: updatedTemplate,
    surveyConfig,
  });
});


exports.replaceExamSurveyTemplate = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { sourceTemplateId, surveyType } = req.body || {};

  if (!["preExam", "postExam"].includes(surveyType)) {
    return res.status(400).json({
      message: "surveyType must be preExam or postExam",
    });
  }

  if (!isValidId(examId)) {
    return res.status(400).json({ message: "Invalid exam id" });
  }

  if (!isValidId(sourceTemplateId)) {
    return res.status(400).json({ message: "Invalid source template id" });
  }

  const examCheck = await getExamOr404(examId);

  if (!examCheck.found) {
    return res.status(examCheck.status).json({ message: examCheck.message });
  }

  const sourceTemplate = await SurveyTemplate.findById(sourceTemplateId).lean();

  if (!sourceTemplate) {
    return res.status(404).json({
      message: "Source survey template not found",
    });
  }

  if (!sourceTemplate.isActive) {
    return res.status(400).json({
      message: "Source survey template is not active",
    });
  }

  const clonedQuestions = normalizeQuestions(sourceTemplate.questions || []);

  let targetTemplate = await SurveyTemplate.findOne({
    examId,
    surveyType,
    isActive: true,
  });

  if (targetTemplate) {
    targetTemplate.title = sourceTemplate.title;
    targetTemplate.description = sourceTemplate.description || "";
    targetTemplate.questions = clonedQuestions;
    targetTemplate.questionReviewConfig = sourceTemplate.questionReviewConfig || {};
    targetTemplate.isDefault = false;
  } else {
    targetTemplate = new SurveyTemplate({
      examId,
      surveyType,
      title: sourceTemplate.title,
      description: sourceTemplate.description || "",
      questions: clonedQuestions,
      questionReviewConfig: sourceTemplate.questionReviewConfig || {},
      isDefault: false,
      isActive: true,
      createdBy: examCheck.exam.createdBy || null,
    });
  }

  const savedTemplate = await targetTemplate.save();
  const surveyConfig = await syncExamSurveyConfig(examId);

  return res.json({
    message: `${surveyType === "preExam" ? "Pre" : "Post"} survey replaced successfully`,
    template: savedTemplate,
    surveyConfig,
  });
});

exports.removeTemplateConfiguration = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  if (!isValidId(templateId)) {
    return res.status(400).json({ message: "Invalid template id" });
  }

  const template = await SurveyTemplate.findById(templateId);

  if (!template) {
    return res.status(404).json({
      message: "Survey template not found",
    });
  }

  template.isActive = false;
  await template.save();

  const surveyConfig = template.examId ? await syncExamSurveyConfig(template.examId) : null;

  return res.json({
    message:
      template.surveyType === "standalone"
        ? "Survey deleted successfully"
        : "Survey configuration removed successfully",
    surveyConfig,
  });
});
