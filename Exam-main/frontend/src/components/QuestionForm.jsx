import React, { useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import "./styles/QuestionForm.css";

const defaultForm = {
  questionText: "",
  questionType: "multipleChoice",
  options: ["", "", "", ""],
  correctOption: 0,
  correctOptions: [0],
  correctAnswer: "",
  acceptedAnswers: [""],
  marks: 1,
  difficulty: "easy",
};

const textQuestionTypes = ["oneWord", "fillInTheBlank"];

const normalizeList = (list) => list.map((item) => item.trim()).filter(Boolean);

export default function QuestionForm({ onSave, editingQuestion, onCancel }) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (editingQuestion) {
      setForm({
        ...defaultForm,
        ...editingQuestion,
        options: editingQuestion.options?.length ? editingQuestion.options : ["", "", "", ""],
        correctOptions: editingQuestion.correctOptions?.length ? editingQuestion.correctOptions : [0],
        acceptedAnswers: editingQuestion.acceptedAnswers?.length ? editingQuestion.acceptedAnswers : [""],
      });
    } else {
      setForm(defaultForm);
    }
  }, [editingQuestion]);

  const isTextQuestion = textQuestionTypes.includes(form.questionType);
  const showChoiceOptions = form.questionType === "multipleChoice" || form.questionType === "multiSelect";

  const changeOption = (i, value) => {
    const options = [...form.options];
    options[i] = value;
    setForm({ ...form, options });
  };

  const toggleCorrectMulti = (index) => {
    const next = new Set(form.correctOptions || []);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setForm({ ...form, correctOptions: Array.from(next).sort((a, b) => a - b) });
  };

  const changeAcceptedAnswer = (i, value) => {
    const acceptedAnswers = [...form.acceptedAnswers];
    acceptedAnswers[i] = value.toLowerCase();
    setForm({ ...form, acceptedAnswers });
  };

  const addAcceptedAnswer = () => {
    setForm({ ...form, acceptedAnswers: [...form.acceptedAnswers, ""] });
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      options: showChoiceOptions ? normalizeList(form.options) : undefined,
      correctOption: form.questionType === "multipleChoice" ? Number(form.correctOption) : undefined,
      correctOptions: form.questionType === "multiSelect" ? (form.correctOptions || []).map(Number) : undefined,
      correctAnswer: isTextQuestion ? form.correctAnswer.trim().toLowerCase() : undefined,
      acceptedAnswers: isTextQuestion ? normalizeList(form.acceptedAnswers.map((answer) => answer.toLowerCase())) : undefined,
    };

    await onSave(payload);

    if (!editingQuestion) {
      setForm(defaultForm);
    }
  };

  const handleCancel = () => {
    setForm(defaultForm);
    if (onCancel) onCancel();
  };

  const questionTypes = [
    { value: "multipleChoice", label: "Multiple Choice", icon: "◉" },
    { value: "multiSelect", label: "Multiple Select", icon: "☐" },
    { value: "oneWord", label: "One Word", icon: "✍" },
    { value: "fillInTheBlank", label: "Fill in Blank", icon: "━" },
  ];

  return (
    <form className="question-form card" onSubmit={submit}>
      <div className="form-header">
        <h2>{editingQuestion ? "Edit Question" : "Add Question"}</h2>
      </div>

      {/* Step 1: Question Type Selector */}
      <div className="form-section compact">
        <div className="section-label">
          <span className="step-number">1</span>
          <span className="section-title">Question Type</span>
        </div>
        <div className="question-type-grid compact">
          {questionTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`type-button ${form.questionType === type.value ? "active" : ""}`}
              onClick={() => setForm({ ...form, questionType: type.value })}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Question Settings */}
      <div className="form-section compact">
        <div className="section-label">
          <span className="step-number">2</span>
          <span className="section-title">Settings</span>
        </div>
        <div className="settings-grid">
          <label className="field-group compact">
            <span>Marks</span>
            <input
              type="number"
              min="1"
              value={form.marks}
              onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
              placeholder="Points"
            />
          </label>
          <label className="field-group compact">
            <span>Difficulty</span>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
      </div>

      {/* Step 3: Question Text */}
      <div className="form-section compact">
        <div className="section-label">
          <span className="step-number">3</span>
          <span className="section-title">Question</span>
        </div>
        <div className="field-group field-group-wide">
          <RichTextEditor
            value={form.questionText}
            onChange={(val) => setForm({ ...form, questionText: val })}
            placeholder="Write your question here..."
          />
        </div>
      </div>

      {/* Step 4: Options/Answers */}
      {showChoiceOptions && (
        <div className="form-section compact">
          <div className="section-label">
            <span className="step-number">4</span>
            <span className="section-title">Answer Options</span>
          </div>
          <div className="options-grid">
            {form.options.map((opt, i) => (
              <div key={i} className="option-input-group compact">
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <input
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => changeOption(i, e.target.value)}
                  className="option-input"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Mark Correct Answer */}
      {form.questionType === "multipleChoice" && (
        <div className="form-section compact">
          <div className="section-label">
            <span className="step-number">5</span>
            <span className="section-title">Correct Answer</span>
          </div>
          <div className="correct-answer-grid compact">
            {form.options.map((option, i) => (
              <button
                key={i}
                type="button"
                className={`answer-button compact ${form.correctOption === i ? "active" : ""}`}
                onClick={() => setForm({ ...form, correctOption: i })}
              >
                <span className="answer-letter">{String.fromCharCode(65 + i)}</span>
                <span className="answer-text">{option || `Option ${i + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {form.questionType === "multiSelect" && (
        <div className="form-section compact">
          <div className="section-label">
            <span className="step-number">5</span>
            <span className="section-title">Correct Answers</span>
          </div>
          <div className="checkbox-grid compact">
            {form.options.map((option, index) => (
              <label key={index} className="checkbox-item compact">
                <input
                  type="checkbox"
                  checked={(form.correctOptions || []).includes(index)}
                  onChange={() => toggleCorrectMulti(index)}
                />
                <span className="check-icon">✓</span>
                <span className="check-label">{option || `Option ${index + 1}`}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isTextQuestion && (
        <div className="form-section compact">
          <div className="section-label">
            <span className="step-number">5</span>
            <span className="section-title">Accepted Answers</span>
          </div>
          <div className="text-answer-group compact">
            <label className="field-group compact">
              <span>Primary Answer</span>
              <input
                type="text"
                value={form.correctAnswer}
                placeholder="Enter the correct answer"
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value.toLowerCase() })}
              />
            </label>

            {form.acceptedAnswers.length > 0 && (
              <div className="alternate-answers">
                <div className="alternate-header">
                  <span>Alternative Answers</span>
                  <button type="button" className="add-answer-btn" onClick={addAcceptedAnswer}>
                    + Add
                  </button>
                </div>
                {form.acceptedAnswers.map((answer, index) => (
                  <input
                    key={index}
                    type="text"
                    value={answer}
                    placeholder={`Alternative answer ${index + 1}`}
                    onChange={(e) => changeAcceptedAnswer(index, e.target.value)}
                    className="alternate-input"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="form-actions compact">
        <button type="submit" className="primary-button submit-btn">
          {editingQuestion ? "Update" : "Add"}
        </button>
        {editingQuestion && (
          <button type="button" className="secondary-button" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
