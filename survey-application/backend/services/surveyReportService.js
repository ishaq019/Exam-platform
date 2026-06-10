const SurveyResponse = require("../models/SurveyResponse");
const SurveyTemplate = require("../models/SurveyTemplate");
const Question = require("../models/Question");

async function getSurveyReport(examId) {
  const [templates, responses, examQuestions] = await Promise.all([
    SurveyTemplate.find({ examId }).lean(),
    SurveyResponse.find({ examId }).lean(),
    Question.find({ examId }).select("questionText").sort({ createdAt: 1 }).lean(),
  ]);

  const pre = {};
  const post = { questionReviews: {} };

  const tally = (dataMap, key, rawVal) => {
    if (!key) return;
    if (!dataMap[key]) dataMap[key] = { total: 0, counts: {} };
    dataMap[key].total += 1;
    const val = Array.isArray(rawVal) ? rawVal : (rawVal ?? null);
    if (Array.isArray(val) && val.length > 0) {
      // multiSelect: count every chosen option individually
      val.forEach((item) => {
        const k = String(item ?? "N/A");
        dataMap[key].counts[k] = (dataMap[key].counts[k] || 0) + 1;
      });
    } else {
      const k = String(val ?? "N/A");
      dataMap[key].counts[k] = (dataMap[key].counts[k] || 0) + 1;
    }
  };

  for (const r of responses) {
    if (r.surveyType === "preExam" || r.surveyType === "before") {
      for (const a of r.answers || []) {
        const key = a.fieldName || a.questionKey;
        const val = a.value !== undefined ? a.value : a.answer;
        tally(pre, key, val);
      }
    } else if (r.surveyType === "postExam" || r.surveyType === "after") {
      for (const a of r.answers || []) {
        const key = a.fieldName || a.questionKey;
        const val = a.value !== undefined ? a.value : a.answer;
        tally(post, key, val);
      }
      for (const qr of r.questionReviews || []) {
        const qid = String(qr.questionId);
        post.questionReviews[qid] = post.questionReviews[qid] || {
          total: 0,
          difficultyCounts: {},
          reviews: [],
        };
        post.questionReviews[qid].total += 1;
        const dKey = String(qr.difficulty ?? "N/A");
        post.questionReviews[qid].difficultyCounts[dKey] =
          (post.questionReviews[qid].difficultyCounts[dKey] || 0) + 1;
        if (qr.reviewText) post.questionReviews[qid].reviews.push(qr.reviewText);
      }
    }
  }

  const beforeCount = responses.filter(
    (r) => r.surveyType === "preExam" || r.surveyType === "before"
  ).length;
  const afterCount = responses.filter(
    (r) => r.surveyType === "postExam" || r.surveyType === "after"
  ).length;

  // Build question-wise review analysis with proper text and number
  const questionReviewAnalysis = examQuestions.map((q, index) => {
    const qid = String(q._id);
    const entry = post.questionReviews[qid] || { total: 0, difficultyCounts: {}, reviews: [] };
    return {
      questionId: qid,
      questionNo: index + 1,
      questionText: q.questionText,
      totalReviews: entry.total,
      difficultyDistribution: Object.entries(entry.difficultyCounts).map(([name, value]) => ({
        name,
        value,
      })),
      reviews: entry.reviews,
    };
  });

  // Extract written feedback texts (textarea type answers stored as counts keys)
  const writtenFeedback = Object.keys(post.overallFeedback?.counts || {}).filter(
    (text) => text && text !== "N/A" && text.trim().length > 0
  );

  return {
    templates,
    pre,
    post,
    summary: {
      beforeSurveySubmitted: beforeCount,
      afterSurveySubmitted: afterCount,
    },
    questionReviewAnalysis,
    writtenFeedback,
  };
}

module.exports = { getSurveyReport };
