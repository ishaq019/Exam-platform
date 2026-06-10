import React, { useEffect, useMemo, useState, useContext } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import ExamCard from "../../components/ExamCard";
import Loader from "../../components/Loader";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

export default function ExamList() {
  const { token } = useContext(AuthContext);
  const [exams, setExams] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmExam, setConfirmExam] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get("/exams", { params: { limit: 100 } })
      .then((res) => {
        const data = res.data.data || res.data;
        setExams(Array.isArray(data) ? data : []);
      })
      .catch(() => setExams([]));
  }, [token]);

  const handleDeleteClick = (exam) => {
    setConfirmExam(exam);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmExam || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${confirmExam._id}`);
      setExams((prev) => prev.filter((e) => e._id !== confirmExam._id));
      toast.success(`"${confirmExam.title}" deleted`);
      setConfirmExam(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete exam");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!exams) return [];
    const term = search.trim().toLowerCase();
    return exams.filter((exam) => {
      const matchesSearch =
        !term ||
        exam.title?.toLowerCase().includes(term) ||
        exam.description?.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" || exam.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [exams, search, statusFilter]);

  if (!exams) return <Loader />;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Exams</h2>
          <p className="muted">
            {exams.length} total · {filtered.length} shown
          </p>
        </div>
        <Link className="action-card-kicker" to="/admin/exams/create">
          <button>+ Create Exam</button>
        </Link>
      </div>

      <div className="toolbar">
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="toolbar-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">No exams found</div>
          <div className="empty-state-hint">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filter."
              : "Create your first exam to get started."}
          </div>
          {!search && statusFilter === "all" && (
            <Link to="/admin/exams/create">
              <button>Create Exam</button>
            </Link>
          )}
        </div>
      ) : (
        <div className="dashboard-grid">
          {filtered.map((exam) => (
            <div key={exam._id} className="exam-list-item">
              <ExamCard exam={exam} admin onDelete={handleDeleteClick} />
            </div>
          ))}
        </div>
      )}

      {confirmExam && (
        <div className="modal-backdrop" onClick={() => !deleting && setConfirmExam(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Exam</h3>
            <p>
              Are you sure you want to delete <strong>{confirmExam.title}</strong>? This will
              permanently remove the exam, all its questions, assignments, and attempt records.
            </p>
            <div className="modal-actions">
              <button
                className="danger-button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
              <button
                className="secondary-button"
                onClick={() => setConfirmExam(null)}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
