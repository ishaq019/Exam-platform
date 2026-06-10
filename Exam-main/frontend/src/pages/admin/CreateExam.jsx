import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { buildSurveyAppUrl } from '../../utils/externalApps';
import { localInputToISO, formatDisplayDateTime } from '../../utils/dateTime';

import { buildAppUrl } from '../../utils/appPaths';
import '../../styles/components/CreateQuiz.css';



const steps = ['Basic Info', 'Timing', 'Rules & Survey', 'Review'];

export default function CreateExam() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 30,
    startTime: '',
    endTime: '',
    status: 'scheduled',
    surveyConfig: {
      preExamEnabled: true,
      postExamEnabled: true,
    },
  });

  const errors = useMemo(() => {
    const result = {};
    if (!form.title.trim()) result.title = 'Quiz title is required';
    if (!Number(form.duration) || Number(form.duration) <= 0) result.duration = 'Duration must be greater than 0';
    if (!form.startTime) result.startTime = 'Start time is required';
    if (!form.endTime) result.endTime = 'End time is required';
    if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
      result.endTime = 'End time must be after start time';
    }
    return result;
  }, [form]);

  const canContinue = () => {
    if (step === 0) return !errors.title;
    if (step === 1) return !errors.duration && !errors.startTime && !errors.endTime;
    return true;
  };

  const next = () => {
    if (!canContinue()) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) {
      toast.error('Please complete all required fields correctly');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        duration: Number(form.duration),
        startTime: localInputToISO(form.startTime),
        endTime: localInputToISO(form.endTime),
      };

const { data: exam } = await api.post('/exams', payload);

      if (form.surveyConfig.preExamEnabled || form.surveyConfig.postExamEnabled) {
        toast.success('Quiz created. Opening survey template setup.');
        window.location.href = buildSurveyAppUrl(
          `/admin/exams/${exam._id}/survey-templates?autoCreate=true&preExamEnabled=${form.surveyConfig.preExamEnabled}&postExamEnabled=${form.surveyConfig.postExamEnabled}`,
          buildAppUrl('/admin/exams')
        );
        return;
      }

      toast.success('Quiz created');
      navigate('/admin/exams');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="create-quiz-page" onSubmit={submit}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Create Quiz</h2>
          <p className="muted">Build a professional quiz in guided steps.</p>
        </div>
        <Link className="text-link" to="/admin/exams">Back to quizzes</Link>
      </div>

      <div className="quiz-stepper">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            className={`quiz-step ${index === step ? 'active' : ''} ${index < step ? 'completed' : ''}`}
            onClick={() => setStep(index)}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="create-quiz-grid">
        <section className="card create-quiz-form-card">
          {step === 0 && (
            <div className="form-grid">
              <label className="field-group field-group-wide">
                <span>Quiz Title</span>
                <input
                  value={form.title}
                  placeholder="Example: DBMS Final Assessment"
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {errors.title && <small className="form-error">{errors.title}</small>}
              </label>

              <label className="field-group field-group-wide">
                <span>Description</span>
                <textarea
                  value={form.description}
                  placeholder="Add clear instructions for students"
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="5"
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="form-grid">
              <label className="field-group">
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
                {errors.duration && <small className="form-error">{errors.duration}</small>}
              </label>

              <label className="field-group">
                <span>Start date and time</span>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
                {errors.startTime && <small className="form-error">{errors.startTime}</small>}
              </label>

              <label className="field-group">
                <span>End date and time</span>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
                {errors.endTime && <small className="form-error">{errors.endTime}</small>}
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="create-rules-grid">
              <label className="toggle-card-option">
                <input
                  type="checkbox"
                  checked={form.surveyConfig.preExamEnabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      surveyConfig: { ...form.surveyConfig, preExamEnabled: e.target.checked },
                    })
                  }
                />
                <span>
                  <strong>Enable Pre-Exam Survey</strong>
                  <small>Collect confidence and preparation details before quiz.</small>
                </span>
              </label>

              <label className="toggle-card-option">
                <input
                  type="checkbox"
                  checked={form.surveyConfig.postExamEnabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      surveyConfig: { ...form.surveyConfig, postExamEnabled: e.target.checked },
                    })
                  }
                />
                <span>
                  <strong>Enable Post-Exam Survey</strong>
                  <small>Collect difficulty ratings and question-wise feedback.</small>
                </span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="review-panel">
              <h3>Review Before Creating</h3>
              <dl>
                <div><dt>Title</dt><dd>{form.title || 'Not provided'}</dd></div>
                <div><dt>Duration</dt><dd>{form.duration} minutes</dd></div>
                <div><dt>Start</dt><dd>{formatDisplayDateTime(localInputToISO(form.startTime))}</dd>
</div>
                <div><dt>End</dt><dd>{formatDisplayDateTime(localInputToISO(form.endTime))}</dd></div>
                <div><dt>Pre Survey</dt><dd>{form.surveyConfig.preExamEnabled ? 'Enabled' : 'Disabled'}</dd></div>
                <div><dt>Post Survey</dt><dd>{form.surveyConfig.postExamEnabled ? 'Enabled' : 'Disabled'}</dd></div>
              </dl>
            </div>
          )}

          <div className="create-quiz-actions">
            <button type="button" className="secondary-button" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
              Previous
            </button>
            {step < steps.length - 1 ? (
              <button type="button" onClick={next}>Next</button>
            ) : (
              <button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Quiz'}</button>
            )}
          </div>
        </section>

        <aside className="quiz-live-preview card">
          <p className="eyebrow">Live Preview</p>
          <h3>{form.title || 'Untitled Quiz'}</h3>
          <p>{form.description || 'Student instructions will appear here.'}</p>
          <div className="preview-pill-grid">
            <span>{form.duration || 0} min</span>
            <span>{form.surveyConfig.preExamEnabled ? 'Pre Survey On' : 'Pre Survey Off'}</span>
            <span>{form.surveyConfig.postExamEnabled ? 'Post Survey On' : 'Post Survey Off'}</span>
          </div>
        </aside>
      </div>
    </form>
  );
}
