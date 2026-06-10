import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import Loader from '../../components/Loader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { buildSurveyAppUrl, SURVEY_APP_URL } from '../../utils/externalApps';
import { buildAppUrl } from '../../utils/appPaths';

const normalizeExams = (payload) => {
  const data = payload?.data || payload;
  return Array.isArray(data) ? data : [];
};

const getSurveyStatus = (exam) => {
  const preEnabled = Boolean(exam?.surveyConfig?.preExamEnabled);
  const postEnabled = Boolean(exam?.surveyConfig?.postExamEnabled);

  if (preEnabled && postEnabled) return 'both';
  if (preEnabled) return 'pre';
  if (postEnabled) return 'post';
  return 'none';
};

const getSurveyBadge = (exam) => {
  const status = getSurveyStatus(exam);

  if (status === 'both') {
    return { label: 'Pre + Post Enabled', className: 'success' };
  }

  if (status === 'pre') {
    return { label: 'Pre Enabled', className: 'info' };
  }

  if (status === 'post') {
    return { label: 'Post Enabled', className: 'info' };
  }

  return { label: 'Not Enabled', className: 'muted' };
};

export default function ManageSurvey() {
  const { token } = useContext(AuthContext);
  const [exams, setExams] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [savingExamId, setSavingExamId] = useState(null);

  const loadExams = async () => {
    try {
      const response = await api.get('/exams', { params: { limit: 100 } });
      setExams(normalizeExams(response.data));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load quizzes');
      setExams([]);
    }
  };

  useEffect(() => {
    if (token) loadExams();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredExams = useMemo(() => {
    const list = Array.isArray(exams) ? exams : [];
    const term = search.trim().toLowerCase();

    return list.filter((exam) => {
      const matchesSearch =
        !term ||
        exam.title?.toLowerCase().includes(term) ||
        exam.description?.toLowerCase().includes(term);

      const surveyStatus = getSurveyStatus(exam);
      const matchesFilter = filter === 'all' || surveyStatus === filter;

      return matchesSearch && matchesFilter;
    });
  }, [exams, filter, search]);

  const updateSurveyConfig = async (exam, patch) => {
    if (!exam?._id || savingExamId) return;

    const nextSurveyConfig = {
      preExamEnabled: Boolean(exam?.surveyConfig?.preExamEnabled),
      postExamEnabled: Boolean(exam?.surveyConfig?.postExamEnabled),
      ...patch,
    };

    const payload = {
      title: exam.title,
      description: exam.description || '',
      duration: Number(exam.duration),
      startTime: exam.startTime,
      endTime: exam.endTime,
      status: exam.status,
      surveyConfig: nextSurveyConfig,
    };

    setSavingExamId(exam._id);

    try {
      const response = await api.put(`/exams/${exam._id}`, payload);
      const updatedExam = response.data;

      setExams((current) =>
        current.map((item) =>
          item._id === exam._id
            ? {
                ...item,
                ...updatedExam,
                surveyConfig: updatedExam.surveyConfig || nextSurveyConfig,
              }
            : item
        )
      );

      toast.success('Survey settings updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update survey settings');
    } finally {
      setSavingExamId(null);
    }
  };

  const getSurveyTemplateUrl = (exam) =>
    buildSurveyAppUrl(
      `/admin/exams/${exam._id}/survey-templates?autoCreate=true&preExamEnabled=${Boolean(
        exam?.surveyConfig?.preExamEnabled
      )}&postExamEnabled=${Boolean(exam?.surveyConfig?.postExamEnabled)}`,
      buildAppUrl('/admin/surveys')
    );

  const getSurveyReportUrl = (exam) =>
    buildSurveyAppUrl(
      `/admin/exams/${exam._id}/survey-report`,
      buildAppUrl('/admin/surveys')
    );

  if (exams === null) return <Loader />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">External Survey Interface</p>
          <h2>Manage Survey</h2>
          <p className="muted">
            Enable pre/post surveys for each quiz and open the external Survey App to configure
            templates or view survey reports.
          </p>
        </div>

        <Link className="text-link" to="/admin/exams/create">
          Create Quiz
        </Link>
      </div>

      <div className="section-card survey-integration-card">
        <div>
          <p className="eyebrow">Connected Application</p>
          <h3>Survey App</h3>
          <p className="muted">
            Current external survey frontend: <strong>{SURVEY_APP_URL}</strong>
          </p>
        </div>
        <p className="muted">
          The quiz app controls whether a quiz needs a survey. The survey app owns survey
          templates, student survey responses, and survey reports.
        </p>
      </div>

      <div className="toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Search quiz title or description..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          className="toolbar-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All survey states</option>
          <option value="both">Pre + Post enabled</option>
          <option value="pre">Only pre survey</option>
          <option value="post">Only post survey</option>
          <option value="none">No survey</option>
        </select>
      </div>

      {filteredExams.length ? (
        <div className="survey-management-grid">
          {filteredExams.map((exam) => {
            const badge = getSurveyBadge(exam);
            const isSaving = savingExamId === exam._id;

            return (
              <div className="card survey-management-card" key={exam._id}>
                <div className="exam-card-header">
                  <div>
                    <p className="eyebrow">Quiz Survey</p>
                    <h3>{exam.title}</h3>
                    <p className="muted survey-management-description">
                      {exam.description || 'No description available'}
                    </p>
                  </div>

                  <span className={`table-status ${badge.className}`}>{badge.label}</span>
                </div>

                <div className="survey-toggle-panel">
                  <label className="survey-toggle-row">
                    <input
                      type="checkbox"
                      checked={Boolean(exam?.surveyConfig?.preExamEnabled)}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateSurveyConfig(exam, {
                          preExamEnabled: event.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>Pre-exam survey</strong>
                      <small>Student must answer before starting the quiz.</small>
                    </span>
                  </label>

                  <label className="survey-toggle-row">
                    <input
                      type="checkbox"
                      checked={Boolean(exam?.surveyConfig?.postExamEnabled)}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateSurveyConfig(exam, {
                          postExamEnabled: event.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>Post-exam survey</strong>
                      <small>Student answers after submitting the quiz.</small>
                    </span>
                  </label>
                </div>

                <div className="actions survey-management-actions">
                  <a className="button-link" href={getSurveyTemplateUrl(exam)}>
                    Setup External Survey
                  </a>

                  <a className="secondary-button" href={getSurveyReportUrl(exam)}>
                    Survey Report
                  </a>

                  <Link className="text-link" to={`/admin/exams/${exam._id}/edit`}>
                    Edit Quiz
                  </Link>
                </div>

                {isSaving ? <p className="muted">Saving survey settings...</p> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-state-title">No quizzes found</div>
          <div className="empty-state-hint">
            {search || filter !== 'all'
              ? 'Try changing the search or survey filter.'
              : 'Create a quiz first, then connect surveys here.'}
          </div>
          {!search && filter === 'all' ? (
            <Link to="/admin/exams/create">
              <button>Create Quiz</button>
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
