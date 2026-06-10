const DUPLICATE_MESSAGES = {
  attempts:        "This exam attempt was already submitted. Please refresh the page.",
  surveyresponses: "This survey was already submitted.",
  examassignments: "This student is already assigned to the exam.",
};

const errorHandler = (err, req, res, _next) => {
  const status = res.statusCode === 200 ? 500 : res.statusCode;

  if (err.code === 11000) {
    const collection = err.message?.match(/collection: \S+\.(\w+)/i)?.[1]?.toLowerCase();
    const message = DUPLICATE_MESSAGES[collection] || "This record already exists.";
    return res.status(409).json({ message });
  }

  res.status(status).json({
    message: err.message || "Server error",
  });
};

module.exports = errorHandler;
