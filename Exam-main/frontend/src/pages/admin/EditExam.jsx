import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { toInputDateTime, localInputToISO } from "../../utils/dateTime";
import Loader from "../../components/Loader";
import api from "../../services/api";

export default function EditExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get(`/exams/${examId}`)
      .then((res) =>
    setForm({
      ...res.data,
      startTime: toInputDateTime(res.data.startTime),
      endTime: toInputDateTime(res.data.endTime),
    })
)
      .catch(() => toast.error("Failed to load exam"));
  }, [examId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
  ...form,
  duration: Number(form.duration),
  startTime: localInputToISO(form.startTime),
  endTime: localInputToISO(form.endTime),
};

await api.put(`/exams/${examId}`, payload);
      toast.success("Exam updated");
      navigate("/admin/exams");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update exam");
    }
  };

  const deleteExam = async () => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${examId}`);
      toast.success("Exam deleted");
      navigate("/admin/exams");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete exam");
      setDeleting(false);
    }
  };

  if (!form) return <Loader />;

  return (
    <form className="card form form-wide" onSubmit={submit}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Edit Exam</h2>
          <p className="muted">Update exam details and schedule.</p>
        </div>
        <Link className="text-link" to="/admin/exams">
          Back to exams
        </Link>
      </div>

      <div className="form-grid">
        <label className="field-group">
          <span>Title</span>
          <input
            value={form.title}
            placeholder="Midterm Assessment"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label className="field-group field-group-wide">
          <span>Description</span>
          <textarea
            value={form.description}
            placeholder="Short instructions for students"
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="4"
          />
        </label>

        <label className="field-group">
          <span>Duration (minutes)</span>
          <input
            type="number"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </label>

        <label className="field-group">
          <span>Start date and time</span>
          <input
            type="datetime-local"
            value={form.startTime || ""}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </label>

        <label className="field-group">
          <span>End date and time</span>
          <input
            type="datetime-local"
            value={form.endTime || ""}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </label>

        <label className="field-group">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      <div className="actions">
        <button type="submit">Update Exam</button>
        <button
          type="button"
          className="secondary-button"
          onClick={deleteExam}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete Exam"}
        </button>
      </div>
    </form>
  );
}
