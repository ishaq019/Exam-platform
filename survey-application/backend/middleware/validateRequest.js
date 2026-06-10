const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400).json({
    message: "Validation failed",
    errors: errors.array().map((e) => e.msg),
  });
};

module.exports = validateRequest;
