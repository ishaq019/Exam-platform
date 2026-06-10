const { body } = require("express-validator");

exports.attemptValidator = [
  body("answers").isArray().withMessage("Answers must be an array"),

  body("answers.*.questionId")
    .notEmpty()
    .withMessage("Question id is required"),

  body("answers.*.selectedOption")
    .optional({ values: "null" })
    .isInt({ min: 0 })
    .withMessage("Selected option must be a valid option index"),

  body("answers.*.selectedOptions")
    .optional()
    .isArray()
    .withMessage("Selected options must be an array"),

  body("answers.*.selectedOptions.*")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Selected option indexes must be valid integers"),

  body("answers.*.textAnswer")
    .optional()
    .isString()
    .withMessage("Text answer must be a string"),

  body("answers.*.answer")
    .optional()
    .isString()
    .withMessage("Answer must be a string"),

  body("answers.*.isMarkedForReview")
    .optional()
    .isBoolean()
    .withMessage("Marked for review must be true or false"),

  body("answers.*.workArea")
    .optional()
    .isString()
    .isLength({ max: 5000 })
    .withMessage("Work area is too long"),

  body("autoSubmitted")
    .optional()
    .isBoolean()
    .withMessage("Auto submitted must be true or false"),
];