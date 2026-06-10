import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import QuestionForm from "../../components/QuestionForm";
import Loader from "../../components/Loader";
import api from "../../services/api";

export default function AddQuestions() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndexRef = React.useRef(null);

  const load = useCallback(() => {
    api.get(`/exams/${examId}/questions`, { params: { limit: 100 } })
      .then((res) => {
        const data = res.data.data || res.data;
        setQuestions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        toast.error("Failed to load questions");
        setQuestions([]);
      });
  }, [examId]);

  useEffect(() => { load(); }, [load]);

  const save = async (form) => {
    try {
      if (editingId) {
        await api.put(`/questions/${editingId}`, form);
        toast.success("Question updated");
        setEditingId(null);
        setEditingQuestion(null);
      } else {
        await api.post(`/exams/${examId}/questions`, form);
        toast.success("Question added");
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save question");
    }
  };

  const startEdit = (question) => {
    setEditingId(question._id);
    setEditingQuestion(question);
  };

  const handleDragStart = (e, index) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...questions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setQuestions(reordered);
    setDragOverIndex(null);
    dragIndexRef.current = null;
    try {
      await api.put(`/exams/${examId}/questions/reorder`, {
        questionIds: reordered.map((q) => q._id),
      });
    } catch {
      toast.error("Failed to save new order");
      load();
    }
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  const deleteQuestion = async (questionId) => {
    if (deletingId === questionId) {
      // Confirm deletion
      setIsDeleting(true);
      try {
        await api.delete(`/questions/${questionId}`);
        toast.success("Question deleted");
        setDeletingId(null);
        setIsDeleting(false);
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete question");
        setIsDeleting(false);
      }
    } else {
      // Show confirmation
      setDeletingId(questionId);
    }
  };

  if (questions === null) return <Loader />;

  return (
    <div className="question-management">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Manage Questions</h2>
          <p className="muted">Add, edit, or delete exam questions.</p>
        </div>
        <Link className="text-link" to="/admin/exams">
          Back to exams
        </Link>
      </div>

      <QuestionForm
        onSave={save}
        editingQuestion={editingQuestion}
        onCancel={() => {
          setEditingId(null);
          setEditingQuestion(null);
        }}
      />

      <div className="card">
        <h3>Questions ({questions.length})</h3>
      </div>

      {questions.length === 0 ? (
        <div className="card">
          <p className="muted">No questions added yet.</p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q, idx) => (
            <div
              className={`card question-list-item${dragOverIndex === idx ? " drag-over" : ""}`}
              key={q._id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <div className="question-header">
                <div className="question-number">
                  <span className="drag-handle" title="Drag to reorder">⠿</span>
                  <strong>Q{idx + 1}</strong>
                  <span className="question-marks">{q.marks} marks</span>
                  <span className={`question-difficulty difficulty-${q.difficulty}`}>
                    {q.difficulty}
                  </span>
                </div>
                <div className="question-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => startEdit(q)}
                    disabled={deletingId === q._id}
                  >
                    Edit
                  </button>
                  {deletingId === q._id ? (
                    <>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => deleteQuestion(q._id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting…" : "Confirm Delete?"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setDeletingId(null)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button danger-button"
                      onClick={() => deleteQuestion(q._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="question-text" dangerouslySetInnerHTML={{ __html: q.questionText }} />
              <div className="question-options">
                {Array.isArray(q.options) && q.options.length > 0 ? (
                  q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`question-option ${
                        q.questionType === "multipleChoice" && i === q.correctOption
                          ? "correct"
                          : ""
                      }`}
                    >
                      <span className="option-label">{String.fromCharCode(65 + i)}:</span>
                      <span>{opt}</span>
                      {q.questionType === "multipleChoice" && i === q.correctOption && (
                        <span className="correct-badge">✓ Correct</span>
                      )}
                      {q.questionType === "multiSelect" && Array.isArray(q.correctOptions) && q.correctOptions.includes(i) && (
                        <span className="correct-badge">✓ Correct</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="muted">
                    {Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0
                      ? `Accepted answers: ${q.acceptedAnswers.join(', ')}`
                      : q.correctAnswer
                        ? `Correct answer: ${q.correctAnswer}`
                        : 'No options configured'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
