import api from './api';

export const createQuestion = (examId, payload) =>
  api.post(`/exams/${examId}/questions`, payload).then((r) => r.data);

export const updateQuestion = (questionId, payload) =>
  api.put(`/questions/${questionId}`, payload).then((r) => r.data);

export const fetchQuestions = (examId) =>
  api.get(`/exams/${examId}/questions`).then((r) => r.data);
