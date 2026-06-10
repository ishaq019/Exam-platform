import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import Loader from "../../components/Loader";
import api from "../../services/api";

export default function AssignStudents() {
  const { examId } = useParams();

  const [students, setStudents] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [studentsRes, assignedRes] = await Promise.all([
        api.get("/admin/students"),
        api.get(`/admin/exams/${examId}/assigned-students`),
      ]);

      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      setAssignedStudents(
        Array.isArray(assignedRes.data) ? assignedRes.data : []
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (examId) loadData();
  }, [examId, loadData]);

  const toggleStudent = (studentId) => {
    setSelectedStudents((old) =>
      old.includes(studentId)
        ? old.filter((id) => id !== studentId)
        : [...old, studentId]
    );
  };

  const selectAll = () => {
    setSelectedStudents(students.map((student) => student._id));
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  const assignStudents = async () => {
    if (!selectedStudents.length) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post(`/admin/exams/${examId}/assign`, {
        studentIds: selectedStudents,
        maxAttempts: Number(maxAttempts),
      });

      toast.success(res.data.message || "Students assigned successfully");

      setSelectedStudents([]);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Assignment failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  const studentSearchTerm = studentSearch.trim().toLowerCase();
  const visibleStudents = studentSearchTerm
    ? students.filter(
        (s) =>
          s.name?.toLowerCase().includes(studentSearchTerm) ||
          s.email?.toLowerCase().includes(studentSearchTerm)
      )
    : students;

  const totalAttemptsUsed = assignedStudents.reduce(
    (sum, a) => sum + (a.attemptsUsed || 0),
    0
  );

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Assign Students</h2>
          <p className="muted">
            Select students and configure how many times they can attend this exam.
          </p>
        </div>

        <Link className="text-link" to="/admin/exams">
          ← Back to exams
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-accent-primary">
          <span className="stat-card-label">Available Students</span>
          <span className="stat-card-value">{students.length}</span>
        </div>
        <div className="stat-card stat-card-accent-success">
          <span className="stat-card-label">Already Assigned</span>
          <span className="stat-card-value">{assignedStudents.length}</span>
        </div>
        <div className="stat-card stat-card-accent-warning">
          <span className="stat-card-label">Selected Now</span>
          <span className="stat-card-value">{selectedStudents.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Attempts Used</span>
          <span className="stat-card-value">{totalAttemptsUsed}</span>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3>Attempt Configuration</h3>
            <p className="muted">How many times each assigned student can attend.</p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field-group">
            <span>Maximum Attempts Per Student</span>
            <input
              type="number"
              value={maxAttempts}
              onChange={(event) => setMaxAttempts(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3>Select Students</h3>
            <p className="muted">
              {selectedStudents.length} of {visibleStudents.length} selected
            </p>
          </div>

          <div className="actions">
            <button type="button" className="secondary-button" onClick={selectAll}>
              Select All
            </button>
            <button type="button" className="secondary-button" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-search">
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
        </div>

        {visibleStudents.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Select</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudent(student._id)}
                      />
                    </td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">
              {students.length === 0 ? "No student users found" : "No matches"}
            </div>
            <div className="empty-state-hint">
              {students.length === 0
                ? "Register users with the student role first."
                : "Try a different search term."}
            </div>
          </div>
        )}

        <div className="submit-bar">
          <button onClick={assignStudents} disabled={submitting || !selectedStudents.length}>
            {submitting ? "Assigning..." : `Assign ${selectedStudents.length || ""} Student${selectedStudents.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div>
            <h3>Already Assigned</h3>
            <p className="muted">{assignedStudents.length} student(s)</p>
          </div>
        </div>

        {assignedStudents.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="td-number">Max</th>
                  <th className="td-number">Used</th>
                  <th className="td-number">Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedStudents.map((assignment) => {
                  const remaining = assignment.remainingAttempts ?? 0;
                  const exhausted = remaining === 0;
                  return (
                    <tr key={assignment._id}>
                      <td>{assignment.studentId?.name || "-"}</td>
                      <td>{assignment.studentId?.email || "-"}</td>
                      <td className="td-number">{assignment.maxAttempts || 1}</td>
                      <td className="td-number">{assignment.attemptsUsed || 0}</td>
                      <td className="td-number">{remaining}</td>
                      <td>
                        <span className={`table-status ${exhausted ? "muted" : "success"}`}>
                          {exhausted ? "Exhausted" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No students assigned yet</div>
            <div className="empty-state-hint">
              Select students from the table above and click Assign.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}