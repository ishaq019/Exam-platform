const { body } = require("express-validator");

exports.examValidator = [
  body("title").notEmpty().withMessage("Title is required"),
  body("duration").isInt({ min: 1 }).withMessage("Duration must be valid"),
  body("startTime").isISO8601().withMessage("Valid start time required"),
  body("endTime").isISO8601().withMessage("Valid end time required"),
  body("surveyConfig.preExamEnabled")
    .optional()
    .isBoolean()
    .withMessage("preExamEnabled must be true or false"),
  body("surveyConfig.postExamEnabled")
    .optional()
    .isBoolean()
    .withMessage("postExamEnabled must be true or false"),
  body("endTime").custom((end, { req }) => {
    if (new Date(end) <= new Date(req.body.startTime)) {
      throw new Error("End time must be after start time");
    }
    return true;
  }),
];
