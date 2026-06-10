import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { token, user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalExams: 0,
    scheduled: 0,
    completed: 0,
    surveysEnabled: 0,
  });

  useEffect(() => {
    if (!token) return;

    api
      .get('/exams', { params: { limit: 100 } })
      .then((res) => {
        const exams = Array.isArray(res.data?.data) ? res.data.data : [];
        const count = (status) => exams.filter((exam) => exam.status === status).length;
        const surveysEnabled = exams.filter(
          (exam) => exam.surveyConfig?.preExamEnabled || exam.surveyConfig?.postExamEnabled
        ).length;

        setStats({
          totalExams: exams.length,
          scheduled: count('scheduled'),
          completed: count('completed'),
          surveysEnabled,
        });
      })
      .catch(() => {});
  }, [token]);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Welcome back{user?.name ? `, ${user.name}` : ''}</h2>
          <p className="muted">
            Manage quizzes, questions, students, reports, and external surveys from one place.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-accent-primary">
          <span className="stat-card-label">Total Quizzes</span>
          <span className="stat-card-value">{stats.totalExams}</span>
          <span className="stat-card-hint">All quizzes created by you</span>
        </div>
        <div className="stat-card stat-card-accent-success">
          <span className="stat-card-label">Scheduled</span>
          <span className="stat-card-value">{stats.scheduled}</span>
          <span className="stat-card-hint">Active or upcoming quizzes</span>
        </div>
        <div className="stat-card stat-card-accent-warning">
          <span className="stat-card-label">Surveys Enabled</span>
          <span className="stat-card-value">{stats.surveysEnabled}</span>
          <span className="stat-card-hint">Connected with external Survey App</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Completed</span>
          <span className="stat-card-value">{stats.completed}</span>
          <span className="stat-card-hint">Finished quizzes</span>
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid-main-actions">
        <Link className="action-card" to="/admin/exams/create">
          <span className="action-card-icon">＋</span>
          <span className="action-card-kicker">Create Quiz</span>
          <h3>Create Quiz</h3>
          <p className="muted">
            Create a new quiz, set duration, schedule, and enable pre/post surveys.
          </p>
        </Link>

        <Link className="action-card" to="/admin/exams">
          <span className="action-card-icon">Q</span>
          <span className="action-card-kicker">Manage Quiz</span>
          <h3>Manage Quiz</h3>
          <p className="muted">
            Edit quizzes, add questions, assign students, and open exam reports.
          </p>
        </Link>

        <Link className="action-card" to="/admin/surveys">
          <span className="action-card-icon">S</span>
          <span className="action-card-kicker">Manage Survey</span>
          <h3>Manage Survey</h3>
          <p className="muted">
            Connect each quiz to the external Survey App and configure survey templates.
          </p>
        </Link>
      </div>
    </div>
  );
}
