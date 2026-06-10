import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// import Loader from '../../components/Loader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import stripHtml from '../../utils/stripHtml';
import { buildSurveyAppUrl } from '../../utils/externalApps';
import { buildAppUrl } from '../../utils/appPaths';
import '../../styles/components/ExamAttempt.css';

const formatTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, seconds);
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return [hrs, mins, secs].map((value) => String(value).padStart(2, '0')).join(':');
};

const createEmptyResponse = () => ({
  selectedOption: null,
  selectedOptions: [],
  textAnswer: '',
  isMarkedForReview: false,
  workArea: '',
});

const isQuestionAnswered = (question, response = {}) => {
  if (question.questionType === 'multiSelect') {
    return Array.isArray(response.selectedOptions) && response.selectedOptions.length > 0;
  }

  if (question.questionType === 'fillInTheBlank' || question.questionType === 'oneWord') {
    return typeof response.textAnswer === 'string' && response.textAnswer.trim().length > 0;
  }

  return response.selectedOption !== undefined && response.selectedOption !== null;
};

export default function AttemptQuiz() {
  const { examId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [responses, setResponses] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visited, setVisited] = useState(new Set([0]));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Ready');
  const [violationCount, setViolationCount] = useState(0);

  const responsesRef = useRef({});
  const submittingRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    api
      .get(`/student/exams/${examId}/start`)
      .then((res) => {
        const payload = res.data;
        setData(payload);
        setRemainingSeconds(Number(payload.remainingSeconds) || 0);
        setVisited(new Set([0]));
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Cannot start exam';
        toast.error(msg);
        setLoadError(msg);
      });
  }, [examId]);

  const questions = useMemo(() => {
  const rawQuestions = data?.questions || data?.exam?.questions || [];

  return rawQuestions
    .filter(Boolean)
    .map((question, index) => ({
      ...question,
      _id: question._id || question.id || `question-${index}`,
      questionText:
        question.questionText ||
        question.text ||
        question.title ||
        question.label ||
        "",
      questionType:
        question.questionType ||
        question.type ||
        "singleChoice",
      options: Array.isArray(question.options) ? question.options : [],
      marks: Number(question.marks || 1),
    }));
}, [data]);
  const currentQuestion = questions[currentIndex];
  const currentResponse = currentQuestion
  ? responses[currentQuestion._id] || createEmptyResponse()
  : createEmptyResponse(); 

  const updateResponse = (questionId, patch) => {
    setResponses((old) => ({
      ...old,
      [questionId]: {
        ...createEmptyResponse(),
        ...(old[questionId] || {}),
        ...patch,
      },
    }));

    setSaveMessage('Saving...');
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setSaveMessage(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }, 450);
  };

  const buildAnswers = useCallback(() => {
    if (!data?.questions) return [];

    return data.questions.map((question) => {
      const response = responsesRef.current[question._id] || {};
      return {
        questionId: question._id,
        selectedOption: response.selectedOption === undefined ? null : response.selectedOption,
        selectedOptions: Array.isArray(response.selectedOptions) ? response.selectedOptions : [],
        textAnswer: typeof response.textAnswer === 'string' ? response.textAnswer.trim().toLowerCase() : '',
        isMarkedForReview: Boolean(response.isMarkedForReview),
        workArea: response.workArea || '',
      };
    });
  }, [data]);

  const submit = useCallback(
    async (autoSubmitted = false) => {
      if (submittingRef.current || !data) return;
      submittingRef.current = true;

      try {
        const res = await api.post(`/student/exams/${examId}/submit`, {
          answers: buildAnswers(),
          autoSubmitted,
        });

        toast.success(autoSubmitted ? 'Time is over. Exam submitted automatically.' : 'Exam submitted');

        const postSurveyRequired =
          res.data?.nextStep?.postSurveyRequired ??
          res.data?.exam?.surveyConfig?.postExamEnabled ??
          data?.exam?.surveyConfig?.postExamEnabled;

        if (postSurveyRequired) {
          const resultKey = `exam-result-${examId}-${Date.now()}`;
          sessionStorage.setItem(resultKey, JSON.stringify(res.data));
          window.location.href = buildSurveyAppUrl(
            `/student/exams/${examId}/after-survey`,
            buildAppUrl(`/result?resultKey=${encodeURIComponent(resultKey)}`),
            user?._id || user?.id
          );
          return;
        }

        navigate('/result', { state: res.data });
      } catch (err) {
        submittingRef.current = false;
        toast.error(err.response?.data?.message || 'Submit failed');
      }
    },
    [buildAnswers, data, examId, navigate, user]
  );

  useEffect(() => {
    if (remainingSeconds === null || submittingRef.current) return undefined;

    if (remainingSeconds <= 0) {
      submit(true);
      return undefined;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((old) => Math.max((old || 0) - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, submit]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && data && !submittingRef.current) {
        setViolationCount((count) => count + 1);
        toast.warn('Exam window changed. Stay on the exam screen.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [data]);

  const goToQuestion = useCallback(
    (index) => {
      if (index < 0 || index >= questions.length) return;
      setCurrentIndex(index);
      setVisited((old) => new Set([...old, index]));
    },
    [questions.length]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'n') {
        event.preventDefault();
        goToQuestion(currentIndex + 1);
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'p') {
        event.preventDefault();
        goToQuestion(currentIndex - 1);
      }

      if (event.key.toLowerCase() === 'm' && currentQuestion) {
        event.preventDefault();
        updateResponse(currentQuestion._id, {
          isMarkedForReview: !currentResponse.isMarkedForReview,
        });
      }

      if (event.key.toLowerCase() === 'c' && currentQuestion) {
        event.preventDefault();
        updateResponse(currentQuestion._id, createEmptyResponse());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQuestion, currentResponse.isMarkedForReview, goToQuestion]);

  const summary = useMemo(() => {
    const answered = questions.filter((question) => isQuestionAnswered(question, responses[question._id])).length;
    const marked = questions.filter((question) => responses[question._id]?.isMarkedForReview).length;
    const answeredMarked = questions.filter(
      (question) => isQuestionAnswered(question, responses[question._id]) && responses[question._id]?.isMarkedForReview
    ).length;
    const notVisited = questions.filter((_, index) => !visited.has(index)).length;
    const notAnswered = Math.max(questions.length - answered - notVisited, 0);

    return { answered, marked, answeredMarked, notVisited, notAnswered };
  }, [questions, responses, visited]);

  const getStatusClass = (question, index) => {
    const response = responses[question._id] || {};
    const answered = isQuestionAnswered(question, response);
    const marked = response.isMarkedForReview;

    if (index === currentIndex) return 'current';
    if (!visited.has(index)) return 'not-visited';
    if (answered && marked) return 'answered-marked';
    if (marked) return 'marked';
    if (answered) return 'answered';
    return 'not-answered';
  };

  const clearCurrentAnswer = () => {
    if (!currentQuestion) return;
    updateResponse(currentQuestion._id, createEmptyResponse());
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {
      toast.info('Fullscreen was blocked by the browser. Continue carefully.');
    });
  };

  if (!data && loadError) {
    return (
      <div className="card exam-error-card">
        <h3>Unable to start exam</h3>
        <p className="muted">{loadError}</p>
        <button onClick={() => navigate('/student/exams')}>Back to Exams</button>
      </div>
    );
  }

  if (!questions.length) {
  return (
    <div className="card exam-error-card">
      <h3>No questions available</h3>
      <p className="muted">
        This exam has no valid questions. Please contact the admin.
      </p>
      <button onClick={() => navigate("/student/exams")}>Back to Exams</button>
    </div>
  );
}
  if (!currentQuestion) {
  return (
    <div className="card exam-error-card">
      <h3>Question not found</h3>
      <p className="muted">
        The selected question could not be loaded.
      </p>
      <button onClick={() => goToQuestion(0)}>Go to First Question</button>
    </div>
  );
}

  
  const timerClass = remainingSeconds <= 120 ? 'danger' : remainingSeconds <= 600 ? 'warning' : 'normal';
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="exam-pro-shell">
      <header className="exam-topbar">
        <div>
          <p className="eyebrow">Protected exam workspace</p>
          <h2>{data.exam.title}</h2>
          <p className="muted">One question at a time · Keyboard: P/N, M mark, C clear</p>
        </div>

        <div className="exam-topbar-actions">
          <span className="save-indicator">{saveMessage}</span>
          <button type="button" className="secondary-button fullscreen-button" onClick={requestFullscreen}>
            Fullscreen
          </button>
          <div className={`exam-timer timer-${timerClass}`}>{formatTime(remainingSeconds || 0)}</div>
        </div>
      </header>

      {violationCount > 0 && (
        <div className="security-warning">
          Warning {violationCount}: You left or changed the exam window. Stay focused until submission.
        </div>
      )}

      <div className="exam-progress-track">
        <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="exam-workspace-grid">
        <main className="exam-question-panel">
          <section className="question-card-pro" key={currentQuestion?._id}>
            <div className="question-card-pro-header">
              <div>
                <span className="question-meta-pill">Question {currentIndex + 1} of {questions.length}</span>
                <h3>{stripHtml(currentQuestion.questionText || currentQuestion.text || "Untitled question")}</h3>
              </div>
              <span className="marks-pill">
  {Number(currentQuestion.marks || 1)} Mark{Number(currentQuestion.marks || 1) === 1 ? "" : "s"}
</span>
            </div>

            <div className="option-list-pro">
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 &&
                currentQuestion.options.map((option, optionIndex) => {
                  if (currentQuestion.questionType === 'multiSelect') {
                    const checked = Array.isArray(currentResponse.selectedOptions) && currentResponse.selectedOptions.includes(optionIndex);
                    return (
                      <label key={optionIndex} className={`option-card-pro ${checked ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const selectedOptions = Array.isArray(currentResponse.selectedOptions)
                              ? currentResponse.selectedOptions
                              : [];
                            const next = selectedOptions.includes(optionIndex)
                              ? selectedOptions.filter((item) => item !== optionIndex)
                              : [...selectedOptions, optionIndex];
                            updateResponse(currentQuestion._id, { selectedOptions: next });
                          }}
                        />
                        <span className="option-index">{String.fromCharCode(65 + optionIndex)}</span>
                        <span>{option}</span>
                      </label>
                    );
                  }

                  const checked = currentResponse.selectedOption === optionIndex;
                  return (
                    <label key={optionIndex} className={`option-card-pro ${checked ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={currentQuestion._id}
                        checked={checked}
                        onChange={() => updateResponse(currentQuestion._id, { selectedOption: optionIndex })}
                      />
                      <span className="option-index">{String.fromCharCode(65 + optionIndex)}</span>
                      <span>{option}</span>
                    </label>
                  );
                })}

              {(currentQuestion.questionType === 'fillInTheBlank' || currentQuestion.questionType === 'oneWord') && (
                <label className="field-group text-answer-card">
                  <span>Your Answer</span>
                  <input
                    type="text"
                    value={currentResponse.textAnswer || ''}
                    placeholder="Type your answer"
                    onChange={(event) => updateResponse(currentQuestion._id, { textAnswer: event.target.value })}
                  />
                </label>
              )}
            </div>

            <label className="work-area-label pro-work-area">
              Rough work area
              <textarea
                value={currentResponse.workArea || ''}
                placeholder="Use this space for rough calculations or notes. It will not affect scoring."
                rows="5"
                onChange={(event) => updateResponse(currentQuestion._id, { workArea: event.target.value })}
              />
            </label>

            <div className="exam-nav-footer">
              <button type="button" className="secondary-button" onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0}>
                Previous
              </button>
              <button
                type="button"
                className={`review-button ${currentResponse.isMarkedForReview ? 'active' : ''}`}
                onClick={() => updateResponse(currentQuestion._id, { isMarkedForReview: !currentResponse.isMarkedForReview })}
              >
                {currentResponse.isMarkedForReview ? 'Review Marked' : 'Mark for Review'}
              </button>
              <button type="button" className="secondary-button" onClick={clearCurrentAnswer}>
                Clear Response
              </button>
              <button type="button" onClick={() => goToQuestion(currentIndex + 1)} disabled={currentIndex === questions.length - 1}>
                Save & Next
              </button>
            </div>
          </section>
        </main>

        <aside className="question-palette-panel">
          <div className="palette-card">
            <h3>Question Menu</h3>
            <div className="palette-stats-grid">
              <span><strong>{summary.answered}</strong> Answered</span>
              <span><strong>{summary.notAnswered}</strong> Not answered</span>
              <span><strong>{summary.marked}</strong> Marked</span>
              <span><strong>{summary.notVisited}</strong> Not visited</span>
            </div>

            <div className="question-palette-grid">
              {questions.map((question, index) => (
                <button
                  key={question._id}
                  type="button"
                  className={`palette-number ${getStatusClass(question, index)}`}
                  onClick={() => goToQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="question-legend">
              <span><i className="legend-dot answered" /> Answered</span>
              <span><i className="legend-dot not-answered" /> Not Answered</span>
              <span><i className="legend-dot marked" /> Marked</span>
              <span><i className="legend-dot answered-marked" /> Answered + Marked</span>
              <span><i className="legend-dot not-visited" /> Not Visited</span>
              <span><i className="legend-dot current" /> Current</span>
            </div>

            <button type="button" className="submit-exam-button" onClick={() => setShowSubmitModal(true)}>
              Submit Exam
            </button>
          </div>
        </aside>
      </div>

      {showSubmitModal && (
        <div className="modal-backdrop" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-box submit-summary-modal" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">Final confirmation</p>
            <h3>Submit exam?</h3>
            <div className="submit-summary-grid">
              <span>Total <strong>{questions.length}</strong></span>
              <span>Answered <strong>{summary.answered}</strong></span>
              <span>Not Answered <strong>{summary.notAnswered}</strong></span>
              <span>Marked <strong>{summary.marked}</strong></span>
            </div>
            <p className="muted">Once submitted, you cannot change your answers.</p>
            <div className="modal-actions">
              <button className="danger-button" onClick={() => submit(false)}>Yes, Submit</button>
              <button className="secondary-button" onClick={() => setShowSubmitModal(false)}>Continue Exam</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
