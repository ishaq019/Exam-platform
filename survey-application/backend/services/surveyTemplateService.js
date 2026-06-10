const SurveyTemplate = require("../models/SurveyTemplate");

const DEFAULT_PRE_QUESTIONS = [
  {
    label: "How did you prepare for this exam?",
    fieldName: "preparationSource",
    type: "multiSelect",
    required: true,
    options: [
      "Classroom notes",
      "Textbook",
      "YouTube",
      "Online course",
      "Previous question papers",
      "Self-study",
    ],
    order: 0,
    helpText: "Select all sources you used for preparation.",
  },
  {
    label: "How much syllabus did you complete?",
    fieldName: "syllabusCoverage",
    type: "singleChoice",
    required: true,
    options: ["Below 25%", "25% - 50%", "50% - 75%", "Above 75%"],
    order: 1,
  },
  {
    label: "How confident are you before starting the exam?",
    fieldName: "confidenceLevel",
    type: "rating",
    required: true,
    config: { min: 1, max: 5, step: 1 },
    order: 2,
  },
];

const DEFAULT_POST_QUESTIONS = [
  {
    label: "How difficult was the overall exam?",
    fieldName: "overallDifficulty",
    type: "singleChoice",
    required: true,
    options: ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
    order: 0,
  },
  {
    label: "Was the exam time sufficient?",
    fieldName: "timeSufficient",
    type: "singleChoice",
    required: true,
    options: ["Yes", "No", "Partially"],
    order: 1,
  },
  {
    label: "Share your overall feedback about the exam.",
    fieldName: "overallFeedback",
    type: "textarea",
    required: false,
    placeholder: "Write your feedback here...",
    order: 2,
  },
];

const POST_QUESTION_REVIEW_CONFIG = {
  enabled: true,
  difficultyOptions: ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
  allowReviewText: true,
};

const cloneQuestions = (questions) =>
  questions.map((question, index) => ({
    ...question,
    order: index,
    options: Array.isArray(question.options) ? [...question.options] : [],
    config: question.config ? { ...question.config } : {},
  }));

async function createDefaultTemplatesForExam(examId, createdBy, options = {}) {
  const templates = [];

  const shouldCreatePre = options.preExamEnabled !== false;
  const shouldCreatePost = options.postExamEnabled !== false;

  if (shouldCreatePre) {
    let pre = await SurveyTemplate.findOne({
      examId,
      surveyType: "preExam",
      isActive: true,
    });

    if (!pre) {
      pre = await SurveyTemplate.create({
        examId,
        surveyType: "preExam",
        title: "Pre-Exam Survey",
        description: "Questions students answer before starting the exam.",
        isDefault: true,
        isActive: true,
        questions: cloneQuestions(DEFAULT_PRE_QUESTIONS),
        questionReviewConfig: {},
        createdBy: createdBy || null,
      });
    }

    templates.push(pre);
  }

  if (shouldCreatePost) {
    let post = await SurveyTemplate.findOne({
      examId,
      surveyType: "postExam",
      isActive: true,
    });

    if (!post) {
      post = await SurveyTemplate.create({
        examId,
        surveyType: "postExam",
        title: "Post-Exam Survey",
        description: "Questions students answer after submitting the exam.",
        isDefault: true,
        isActive: true,
        questions: cloneQuestions(DEFAULT_POST_QUESTIONS),
        questionReviewConfig: POST_QUESTION_REVIEW_CONFIG,
        createdBy: createdBy || null,
      });
    }

    templates.push(post);
  }

  return templates;
}

module.exports = {
  createDefaultTemplatesForExam,
  DEFAULT_PRE_QUESTIONS,
  DEFAULT_POST_QUESTIONS,
  POST_QUESTION_REVIEW_CONFIG,
};