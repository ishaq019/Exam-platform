import React, { useEffect, useMemo, useState } from "react";
import stripHtml from "../utils/stripHtml";
import "./styles/QuestionForm.css";

const emptyOptions = ["", "", "", ""];

const createDefaultForm = () => ({
  questionType: "multipleChoice",
  questionText: "",
  options: [...emptyOptions],
  correctOptions: [0],
  correctAnswer: "",
  acceptedAnswers: "",
  marks: 1,
  difficulty: "easy",
});

const questionTypeOptions = [
  { value: "multipleChoice", label: "Single select" },
  { value: "multiSelect", label: "Multi select" },
  { value: "oneWord", label: "One word answer" },
];

const difficultyOptions = ["easy", "medium", "hard"];

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatQuestionText = (value) =>
  escapeHtml(value.trim()).replace(/\r?\n/g, "<br />");

const getCorrectIndexes = (question) => {
  if (
    question.questionType === "multipleChoice" &&
    question.correctOption !== undefined &&
    question.correctOption !== null
  ) {
    return [Number(question.correctOption)];
  }

  if (
    question.questionType === "multiSelect" &&
    Array.isArray(question.correctOptions) &&
    question.correctOptions.length
  ) {
    return question.correctOptions.map(Number);
  }

  if (Array.isArray(question.correctOptions) && question.correctOptions.length) {
    return question.correctOptions.map(Number);
  }

  if (question.correctOption !== undefined && question.correctOption !== null) {
    return [Number(question.correctOption)];
  }

  return [0];
};

const normalizeEditingQuestion = (question) => {
  const options = question.options?.length ? question.options : emptyOptions;
  const correctOptions = getCorrectIndexes(question).filter(
    (index) => index >= 0 && index < options.length
  );
  const questionType =
    question.questionType === "oneWord" || question.questionType === "fillInTheBlank"
      ? "oneWord"
      : question.questionType === "multiSelect"
        ? "multiSelect"
        : "multipleChoice";

  return {
    questionType,
    questionText: stripHtml(question.questionText || ""),
    options: options.length < 2 ? [...options, ...emptyOptions].slice(0, 4) : options,
    correctOptions:
      questionType === "multipleChoice"
        ? [correctOptions[0] ?? 0]
        : correctOptions.length
          ? correctOptions
          : [0],
    correctAnswer: question.correctAnswer || "",
    acceptedAnswers: Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers.join(", ")
      : "",
    marks: Number(question.marks || 1),
    difficulty: question.difficulty || "easy",
  };
};

export default function QuestionForm({ onSave, editingQuestion, onCancel }) {
  const [form, setForm] = useState(createDefaultForm);

  useEffect(() => {
    setForm(editingQuestion ? normalizeEditingQuestion(editingQuestion) : createDefaultForm());
  }, [editingQuestion]);

  const selectedCorrect = useMemo(() => new Set(form.correctOptions || []), [form.correctOptions]);

  const updateOption = (index, value) => {
    setForm((current) => {
      const options = [...current.options];
      options[index] = value;
      return { ...current, options };
    });
  };

  const addOption = () => {
    setForm((current) => ({ ...current, options: [...current.options, ""] }));
  };

  const updateQuestionType = (questionType) => {
    setForm((current) => ({
      ...current,
      questionType,
      correctOptions:
        questionType === "multipleChoice"
          ? [Number(current.correctOptions?.[0] ?? 0)]
          : current.correctOptions?.length
            ? current.correctOptions
            : [0],
    }));
  };

  const removeOption = (index) => {
    setForm((current) => {
      if (current.options.length <= 2) return current;

      const options = current.options.filter((_, optionIndex) => optionIndex !== index);
      const correctOptions = (current.correctOptions || [])
        .filter((optionIndex) => optionIndex !== index)
        .map((optionIndex) => (optionIndex > index ? optionIndex - 1 : optionIndex));

      return {
        ...current,
        options,
        correctOptions: correctOptions.length ? correctOptions : [0],
      };
    });
  };

  const toggleCorrectOption = (index) => {
    setForm((current) => {
      if (current.questionType === "multipleChoice") {
        return { ...current, correctOptions: [index] };
      }

      const next = new Set(current.correctOptions || []);

      if (next.has(index) && next.size > 1) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return { ...current, correctOptions: Array.from(next).sort((a, b) => a - b) };
    });
  };

  const handleCancel = () => {
    setForm(createDefaultForm());
    onCancel?.();
  };

  const submit = async (event) => {
    event.preventDefault();

    const questionText = form.questionText.trim();
    const optionRows = form.options
      .map((option, index) => ({ text: option.trim(), originalIndex: index }))
      .filter((option) => option.text);

    if (!questionText) {
      alert("Please enter the question.");
      return;
    }

    if (form.questionType === "oneWord") {
      const correctAnswer = form.correctAnswer.trim();
      const acceptedAnswers = form.acceptedAnswers
        .split(",")
        .map((answer) => answer.trim())
        .filter(Boolean);

      if (!correctAnswer && acceptedAnswers.length === 0) {
        alert("Please enter the correct one word answer.");
        return;
      }

      const payload = {
        questionText: formatQuestionText(questionText),
        questionType: "oneWord",
        options: [],
        correctOption: null,
        correctOptions: [],
        correctAnswer,
        acceptedAnswers,
        marks: Math.max(1, Number(form.marks || 1)),
        difficulty: form.difficulty,
      };

      await onSave(payload);

      if (!editingQuestion) {
        setForm(createDefaultForm());
      }

      return;
    }

    if (optionRows.length < 2) {
      alert("Please enter at least two options.");
      return;
    }

    const correctOptions = optionRows
      .map((option, filteredIndex) =>
        selectedCorrect.has(option.originalIndex) ? filteredIndex : null
      )
      .filter((index) => index !== null);

    if (correctOptions.length === 0) {
      alert("Mark at least one non-empty option as correct.");
      return;
    }

    if (form.questionType === "multipleChoice" && correctOptions.length !== 1) {
      alert("Single select questions need exactly one correct option.");
      return;
    }

    const payload = {
      questionText: formatQuestionText(questionText),
      questionType: form.questionType,
      options: optionRows.map((option) => option.text),
      correctOption: form.questionType === "multipleChoice" ? correctOptions[0] : null,
      correctOptions: form.questionType === "multiSelect" ? correctOptions : [],
      correctAnswer: "",
      acceptedAnswers: [],
      marks: Math.max(1, Number(form.marks || 1)),
      difficulty: form.difficulty,
    };

    await onSave(payload);

    if (!editingQuestion) {
      setForm(createDefaultForm());
    }
  };

  return (
    <form className="question-form card" onSubmit={submit}>
      <div className="form-header">
        <div>
          <h2>{editingQuestion ? "Edit Question" : "Add Question"}</h2>
          <p>Choose a type, then add options or a one word answer.</p>
        </div>
      </div>

      <label className="question-label-field">
        <span>Question</span>
        <textarea
          value={form.questionText}
          onChange={(event) => setForm({ ...form, questionText: event.target.value })}
          placeholder="Write the question here"
          rows={3}
          required
        />
      </label>

      <div className="question-inline-settings" aria-label="Question settings">
        <label className="question-type-field">
          <span>Question type</span>
          <select
            value={form.questionType}
            onChange={(event) => updateQuestionType(event.target.value)}
          >
            {questionTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Marks</span>
          <input
            type="number"
            min="1"
            value={form.marks}
            onChange={(event) => setForm({ ...form, marks: Number(event.target.value) })}
          />
        </label>

        <div className="difficulty-segment" role="group" aria-label="Difficulty">
          {difficultyOptions.map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              className={form.difficulty === difficulty ? "active" : ""}
              onClick={() => setForm({ ...form, difficulty })}
            >
              {difficulty}
            </button>
          ))}
        </div>
      </div>

      {form.questionType === "oneWord" ? (
        <div className="text-answer-editor">
          <label className="question-label-field">
            <span>Correct answer</span>
            <input
              type="text"
              value={form.correctAnswer}
              onChange={(event) => setForm({ ...form, correctAnswer: event.target.value })}
              placeholder="Type the correct answer"
            />
          </label>

          <label className="question-label-field">
            <span>Accepted alternatives</span>
            <input
              type="text"
              value={form.acceptedAnswers}
              onChange={(event) => setForm({ ...form, acceptedAnswers: event.target.value })}
              placeholder="Optional, comma separated"
            />
          </label>
        </div>
      ) : (
        <div className="question-options-editor">
          <div className="options-heading">
            <span>Options</span>
            <small>
              {form.questionType === "multiSelect"
                ? "Check one or more correct answers."
                : "Select one correct answer."}
            </small>
          </div>

          <div className="option-row-list">
            {form.options.map((option, index) => {
              const isCorrect = selectedCorrect.has(index);

              return (
                <div className={`option-edit-row ${isCorrect ? "correct" : ""}`} key={index}>
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>

                  <input
                    type="text"
                    value={option}
                    onChange={(event) => updateOption(index, event.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />

                  <label className="option-correct-toggle">
                    <input
                      type={form.questionType === "multiSelect" ? "checkbox" : "radio"}
                      name="correct-option"
                      checked={isCorrect}
                      onChange={() => toggleCorrectOption(index)}
                    />
                    <span>Correct</span>
                  </label>

                  <button
                    type="button"
                    className="remove-option-button"
                    onClick={() => removeOption(index)}
                    disabled={form.options.length <= 2}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className="add-option-button" onClick={addOption}>
            Add option
          </button>
        </div>
      )}

      <div className="form-actions compact">
        <button type="submit" className="primary-button submit-btn">
          {editingQuestion ? "Update question" : "Add question"}
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
