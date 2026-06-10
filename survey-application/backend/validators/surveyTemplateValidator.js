const { body, check } = require("express-validator");
const mongoose = require("mongoose");

const validQuestionTypes = [
  "singleChoice",
  "multiSelect",
  "text",
  "textarea",
  "paragraph",
  "number",
  "rating",
  "email",
  "phone",
  "file",
];

const validSurveyTypes = ["preExam", "postExam", "standalone"];

const surveyTemplateValidator = [
  body("surveyType")
    .optional()
    .isIn(validSurveyTypes)
    .withMessage("surveyType must be preExam, postExam, or standalone"),

  body("examId")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
    .withMessage("examId must be a valid id"),

  body("title")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("title cannot be empty"),

  body("questions")
    .optional()
    .isArray()
    .withMessage("questions must be an array"),

  body("questions.*.label")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("question label is required"),

  body("questions.*.fieldName")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("question fieldName is required"),

  body("questions.*.type")
    .optional()
    .isIn(validQuestionTypes)
    .withMessage("invalid question type"),

  check("questions.*").custom((question) => {
    if (!question) return true;

    const type = question.type === "paragraph" ? "textarea" : question.type;

    if (["singleChoice", "multiSelect"].includes(type)) {
      const validOptions = Array.isArray(question.options)
        ? question.options.map((item) => String(item || "").trim()).filter(Boolean)
        : [];

      if (validOptions.length < 2) {
        throw new Error("Choice questions must have at least two options");
      }
    }

    if (type === "rating") {
      const min = Number(question.config?.min ?? 1);
      const max = Number(question.config?.max ?? 5);

      if (Number.isNaN(min) || Number.isNaN(max)) {
        throw new Error("rating config must include numeric min and max");
      }

      if (min >= max) {
        throw new Error("rating min must be less than max");
      }
    }

    return true;
  }),
];

module.exports = surveyTemplateValidator;
