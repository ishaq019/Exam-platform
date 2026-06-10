import React from "react";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Student area</p>
          <h2>Dashboard</h2>
          <p className="muted">Review assigned exams and begin your attempts.</p>
        </div>
      </div>

      <div className="grid dashboard-grid">
        <Link className="card action-card" to="/student/exams">
          <span className="action-card-kicker">Your exams</span>
          <h3>View Assigned Exams</h3>
          <p className="muted">Open the list of active exams you can take now.</p>
        </Link>
      </div>
    </div>
  );
}
