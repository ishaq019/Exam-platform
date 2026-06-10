import { Link } from "react-router-dom";
import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { buildSurveyAppUrl } from "../utils/externalApps";
import { buildAppUrl } from "../utils/appPaths";


export default function ExamCard({ exam, admin, onDelete }) {
  const { user } = useContext(AuthContext);
  const preSurveyEnabled = Boolean(exam?.surveyConfig?.preExamEnabled);
  return (
    <div className="card exam-card">
      <div className="exam-card-header">
        <div>
          <p className="eyebrow">Exam</p>
          <h3>{exam.title}</h3>
        </div>
        <span className="exam-status-pill">{exam.status}</span>
      </div>

      <p className="muted exam-description">{exam.description}</p>

      <div className="exam-meta">
        <span>Duration: {exam.duration} mins</span>
      </div>

      {admin ? (
        <div className="actions exam-card-actions">
          <Link className="text-link" to={`/admin/exams/${exam._id}/questions`}>
            Questions
          </Link>
          <a
            className="text-link"
            href={buildSurveyAppUrl(
              `/admin/exams/${exam._id}/survey-templates`,
              buildAppUrl("/admin/exams")
            )}
          >
            Survey
          </a>
          <Link className="text-link" to={`/admin/exams/${exam._id}/assign`}>
            Assign
          </Link>
          <Link className="text-link" to={`/admin/exams/${exam._id}/report`}>
            Report
          </Link>
          <a
            className="text-link"
            href={buildSurveyAppUrl(
              `/admin/exams/${exam._id}/survey-report`,
              buildAppUrl("/admin/exams")
            )}
          >
            Survey Report
          </a>
          <Link className="text-link" to={`/admin/exams/${exam._id}/edit`}>
            Edit
          </Link>
          {onDelete && (
            <button
              className="text-link exam-card-delete-btn"
              onClick={() => onDelete(exam)}
            >
              Delete
            </button>
          )}
        </div>
      ) : preSurveyEnabled ? (
        <a
          className="text-link"
          href={buildSurveyAppUrl(
            `/student/exams/${exam._id}/before-survey`,
            buildAppUrl(`/student/exams/${exam._id}/attempt`),
            user?._id || user?.id
          )}
        >
          Start Exam
        </a>
      ) : (
        <Link className="text-link" to={`/student/exams/${exam._id}/attempt`}>
          Begin Exam
        </Link>
      )}
    </div>
  );
}
