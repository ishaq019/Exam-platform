const normalizeText = (s) => {
  if (s === null || s === undefined) return '';
  return s.toString().trim().toLowerCase().replace(/\s+/g, ' ');
};

function evaluateQuestionAnswer(question, answer) {
  const max = Number(question.marks) || 1;
  const type = question.questionType;

  if (type === 'multipleChoice') {
    const submitted = answer ? answer.selectedOption : null;
    if (submitted === null || submitted === undefined) {
      return { correct: false, earnedMarks: 0, maxMarks: max };
    }
    const correct = Number(submitted) === Number(question.correctOption);
    return { correct, earnedMarks: correct ? max : 0, maxMarks: max };
  }

  if (type === 'multiSelect') {
    const submitted = answer && Array.isArray(answer.selectedOptions) ? answer.selectedOptions : [];
    const expected = (question.correctOptions || []).map(Number).sort((a, b) => a - b);
    const received = submitted.map(Number).sort((a, b) => a - b);
    const equal = expected.length > 0 &&
      expected.length === received.length &&
      expected.every((v, i) => v === received[i]);
    return { correct: equal, earnedMarks: equal ? max : 0, maxMarks: max };
  }

  if (type === 'oneWord' || type === 'fillInTheBlank') {
    const raw = answer ? answer.textAnswer : '';
    const candidate = normalizeText(raw);
    if (!candidate) return { correct: false, earnedMarks: 0, maxMarks: max };

    const accepted = new Set();
    if (question.correctAnswer) {
      const normalized = normalizeText(question.correctAnswer);
      if (normalized) accepted.add(normalized);
    }
    if (Array.isArray(question.acceptedAnswers)) {
      question.acceptedAnswers.forEach((a) => {
        const normalized = normalizeText(a);
        if (normalized) accepted.add(normalized);
      });
    }

    const matched = accepted.has(candidate);
    return { correct: matched, earnedMarks: matched ? max : 0, maxMarks: max };
  }

  return { correct: false, earnedMarks: 0, maxMarks: max };
}

module.exports = { evaluateQuestionAnswer };
