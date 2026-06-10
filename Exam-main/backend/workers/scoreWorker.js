const { parentPort } = require('worker_threads');
const { evaluateQuestionAnswer } = require('../services/questionEvaluationService');

parentPort.on('message', ({ questions, answers }) => {
  let score = 0;
  let totalMarks = 0;

  const answerMap = new Map();
  answers.forEach((answer) => {
    answerMap.set(String(answer.questionId), answer);
  });

  questions.forEach((question) => {
    const qid = String(question._id);
    const answer = answerMap.get(qid) || null;
    const result = evaluateQuestionAnswer(question, answer);
    totalMarks += result.maxMarks || (Number(question.marks) || 0);
    score += result.earnedMarks || 0;
  });

  parentPort.postMessage({ score, totalMarks });
});