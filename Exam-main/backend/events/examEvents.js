const EventEmitter = require("events");
const logger = require("../utils/logger");
const examEvents = new EventEmitter();

examEvents.on("examSubmitted", ({ examId, studentId, score }) => {
  logger.info(`Exam submitted | exam=${examId} student=${studentId} score=${score}`);
});

module.exports = examEvents;
