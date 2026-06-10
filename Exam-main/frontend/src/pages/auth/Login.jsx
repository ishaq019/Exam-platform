import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import AppLogo from "../../components/AppLogo";
import { SURVEY_APP_URL } from "../../utils/externalApps";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.user, data.token);
      toast.success("Login successful");

      const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
      if (returnUrl) {
        let url;

        try {
          url = new URL(returnUrl, window.location.origin);
        } catch (_error) {
          url = null;
        }

        const surveyOrigin = new URL(SURVEY_APP_URL, window.location.origin).origin;

        if (url?.origin === surveyOrigin) {
          url.searchParams.set("token", data.token);
        }

        if (url) {
          window.location.href = url.toString();
          return;
        }
      }

      navigate(data.user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="card form auth-form" onSubmit={submit}>
        <div className="form-heading">
          <div className="auth-logo-wrap">
            <AppLogo size={52} />
          </div>
          <p className="eyebrow">Welcome back</p>
          <h2>Login</h2>
          <p className="muted">Use your account to continue.</p>
        </div>

        <label className="field-group">
          <span>Email</span>
          <input
            value={form.email}
            placeholder="name@example.com"
            autoComplete="email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label className="field-group">
          <span>Password</span>
          <input
            value={form.password}
            placeholder="Enter your password"
            type="password"
            autoComplete="current-password"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        <button>Login</button>

        <p className="auth-footer">
          <Link to="/forgot-password">Forgot password?</Link>
          <span> · </span>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
