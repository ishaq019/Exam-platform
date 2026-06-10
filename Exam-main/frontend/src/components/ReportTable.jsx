import React from "react";

const formatDuration = (seconds = 0) => {
  const safeSeconds = Number(seconds) || 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  return `${mins}m ${secs}s`;
};

export default function ReportTable({ rows = [] }) {
  if (!rows.length) {
    return <p className="muted">No student submissions have been recorded yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Attempt</th>
            <th>Score</th>
            <th>Total</th>
            <th>Status</th>
            <th>Time Taken</th>
            <th>Submit Type</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              <td>{row.studentName}</td>
              <td>{row.email}</td>
              <td>{row.attemptNumber || 1}</td>
              <td>{row.score}</td>
              <td>{row.totalMarks}</td>
              <td>{row.status}</td>
              <td>{formatDuration(row.timeTakenSeconds)}</td>
              <td>{row.autoSubmitted ? "Auto" : "Manual"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}