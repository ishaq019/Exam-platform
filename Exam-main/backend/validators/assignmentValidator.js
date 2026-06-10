const { body } = require("express-validator");

exports.assignmentValidator = [
  body("studentIds").isArray({ min: 1 }).withMessage("Select at least one student"),
];
