const mongoose = require("mongoose");

const SurveyQuestionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    fieldName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "singleChoice",
        "multiSelect",
        "text",
        "textarea",
        "number",
        "rating",
        "email",
        "phone",
        "file",
      ],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    placeholder: { type: String, default: "" },
    order: { type: Number, default: 0 },
    helpText: { type: String, default: "" },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const QuestionReviewConfigSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    difficultyOptions: {
      type: [String],
      default: ["Very Easy", "Easy", "Moderate", "Difficult", "Very Difficult"],
    },
    allowReviewText: { type: Boolean, default: true },
  },
  { _id: false }
);

const IdCardGeneratorIntegrationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    templateId: { type: String, default: "" },
    apiBaseUrl: { type: String, default: "" },
    webBaseUrl: { type: String, default: "" },
    source: { type: String, default: "google-form" },
    qrData: { type: String, default: "STATIC_DIGIVAL_QR" },
    fieldMap: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        name: "name",
        email: "email",
        photo: "photo",
        employeeId: "employeeId",
        bloodGroup: "bloodGroup",
        phone: "phone",
      }),
    },
  },
  { _id: false }
);

const IntegrationSchema = new mongoose.Schema(
  {
    idCardGenerator: {
      type: IdCardGeneratorIntegrationSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const SurveyTemplateSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
    },

    surveyType: {
      type: String,
      enum: ["preExam", "postExam", "standalone"],
      required: true,
      default: "standalone",
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    questions: { type: [SurveyQuestionSchema], default: [] },

    questionReviewConfig: {
      type: QuestionReviewConfigSchema,
      default: () => ({}),
    },

    integration: {
      type: IntegrationSchema,
      default: () => ({}),
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

SurveyTemplateSchema.index({ examId: 1, surveyType: 1 });
SurveyTemplateSchema.index({ surveyType: 1, isActive: 1 });

module.exports = mongoose.model("SurveyTemplate", SurveyTemplateSchema);
