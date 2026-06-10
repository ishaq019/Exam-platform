const { body, check } = require('express-validator');

const validTypes = ['multipleChoice', 'multiSelect', 'fillInTheBlank', 'oneWord'];

exports.questionValidator = [
  body('examId').optional().isMongoId().withMessage('examId must be a valid id'),
  body('questionText').notEmpty().withMessage('Question text is required'),
  body('questionType').isIn(validTypes).withMessage('Invalid questionType'),
  body('options').optional().isArray(),
  body('options.*').optional().isString(),
  body('correctOption').optional(),
  body('correctOptions').optional().isArray(),
  body('correctOptions.*').optional().isInt(),
  body('correctAnswer').optional().isString(),
  body('acceptedAnswers').optional().isArray(),
  body('acceptedAnswers.*').optional().isString(),
  body('marks').optional().isInt({ min: 0 }).withMessage('Marks must be a valid number'),
  check('questionType').custom((type, { req }) => {
    const options = req.body.options;
    const correctOptions = req.body.correctOptions;
    const acceptedAnswers = req.body.acceptedAnswers;
    const correctAnswer = req.body.correctAnswer;

    if (type === 'multipleChoice') {
      if (!Array.isArray(options) || options.length < 2) {
        throw new Error('multipleChoice questions require at least 2 options');
      }
      if (correctOptionMissing(req.body.correctOption)) {
        throw new Error('multipleChoice questions require correctOption');
      }
    }

    if (type === 'multiSelect') {
      if (!Array.isArray(options) || options.length < 2) {
        throw new Error('multiSelect questions require at least 2 options');
      }
      if (!Array.isArray(correctOptions) || correctOptions.length === 0) {
        throw new Error('multiSelect questions require correctOptions');
      }
    }

    if (type === 'fillInTheBlank' || type === 'oneWord') {
      const hasCorrectAnswer = typeof correctAnswer === 'string' && correctAnswer.trim().length > 0;
      const hasAcceptedAnswers = Array.isArray(acceptedAnswers) && acceptedAnswers.some((answer) => typeof answer === 'string' && answer.trim().length > 0);

      if (!hasCorrectAnswer && !hasAcceptedAnswers) {
        throw new Error('Text questions require correctAnswer or acceptedAnswers');
      }
    }

    return true;
  }),
];

function correctOptionMissing(value) {
  return value === undefined || value === null || value === '';
}
