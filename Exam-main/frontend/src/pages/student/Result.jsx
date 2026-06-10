import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/components/ResultPage.css';

const getStoredResult = (resultKey) => {
  if (!resultKey) return null;
  try {
    const raw = sessionStorage.getItem(resultKey);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const formatSeconds = (seconds = 0) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
};

const getPerformanceLabel = (percentage) => {
  if (percentage >= 85) return 'Excellent';
  if (percentage >= 70) return 'Good';
  if (percentage >= 50) return 'Average';
  return 'Needs Improvement';
};

export default function Result() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const resultKey = params.get('resultKey');
  const state = location.state || getStoredResult(resultKey);

  const analytics = useMemo(() => {
    const score = Number(state?.score) || 0;
    const totalMarks = Number(state?.totalMarks) || 0;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const answers = Array.isArray(state?.answers) ? state.answers : [];
    const answered = answers.filter(
      (answer) =>
        answer.selectedOption !== null ||
        (Array.isArray(answer.selectedOptions) && answer.selectedOptions.length > 0) ||
        (typeof answer.textAnswer === 'string' && answer.textAnswer.trim())
    ).length;
    const marked = answers.filter((answer) => answer.isMarkedForReview).length;
    const unanswered = Math.max(answers.length - answered, 0);

    return {
      score,
      totalMarks,
      percentage,
      answers,
      answered,
      marked,
      unanswered,
      label: getPerformanceLabel(percentage),
    };
  }, [state]);

  const reportNotice = state?.emailReportNotice || (state?.emailReportsQueued ? 'An exam report email has been sent to your inbox.' : null);

  if (!state) {
    return (
      <div className="card empty-state">
        <h3>No result found</h3>
        <p className="muted">Please complete an exam to see your result.</p>
        <Link to="/student/exams">
          <button>Go to Assigned Exams</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="result-page-pro">
      <section className="result-hero-card">
        <div>
          <p className="eyebrow">Submission completed</p>
          <h2>Your Exam Result</h2>
          <p className="muted">Review your score, time, response summary, and marked questions.</p>
        </div>

        <div className="score-ring" style={{ '--score': `${analytics.percentage}%` }}>
          <div className="score-ring-inner">
            <strong>{analytics.percentage}%</strong>
            <span>{analytics.label}</span>
          </div>
        </div>
      </section>

      <section className="result-stat-grid">
        <div className="result-stat-card primary">
          <span>Score</span>
          <strong>{analytics.score}/{analytics.totalMarks}</strong>
        </div>
        <div className="result-stat-card success">
          <span>Answered</span>
          <strong>{analytics.answered}</strong>
        </div>
        <div className="result-stat-card warning">
          <span>Marked for Review</span>
          <strong>{analytics.marked}</strong>
        </div>
        <div className="result-stat-card danger">
          <span>Unanswered</span>
          <strong>{analytics.unanswered}</strong>
        </div>
      </section>

      <section className="result-details-grid">
        <div className="card result-breakdown-card">
          <h3>Performance Breakdown</h3>
          {reportNotice && (
            <div className="success" style={{ marginBottom: '16px' }}>
              {reportNotice}
            </div>
          )}
          <div className="result-bar-row">
            <span>Score Progress</span>
            <div className="result-bar"><i style={{ width: `${analytics.percentage}%` }} /></div>
            <strong>{analytics.percentage}%</strong>
          </div>
          <div className="result-meta-list">
            <span>Time Taken <strong>{formatSeconds(state.timeTakenSeconds)}</strong></span>
            <span>Auto Submitted <strong>{state.autoSubmitted ? 'Yes' : 'No'}</strong></span>
            <span>Submitted At <strong>{state.submittedAt ? new Date(state.submittedAt).toLocaleString() : 'Just now'}</strong></span>
          </div>
        </div>

        <div className="card result-recommendation-card">
          <h3>Recommendation</h3>
          <p>
            {analytics.percentage >= 70
              ? 'Strong performance. Review marked questions and maintain consistency.'
              : 'Focus on unanswered and marked questions. Practice weak topics before the next attempt.'}
          </p>
          <Link to="/student">
            <button>Back to Dashboard</button>
          </Link>
        </div>
      </section>
    </div>
  );
}
