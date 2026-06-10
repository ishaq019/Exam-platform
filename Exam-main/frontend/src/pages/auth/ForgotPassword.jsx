import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import AppLogo from "../../components/AppLogo";

export default function ForgotPassword() {
  const [step, setStep] = useState("request");
  const [form, setForm] = useState({ email: "", otp: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/request-otp", { email: form.email });
      toast.success("Password reset OTP sent to your inbox");
      setStep("reset");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to send reset OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password/reset", {
        email: form.email,
        otp: form.otp,
        password: form.password,
      });
      toast.success("Password reset successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card form auth-form" onSubmit={step === "request" ? requestOtp : resetPassword}>
        <div className="form-heading">
          <div className="auth-logo-wrap">
            <AppLogo size={52} />
          </div>
          <p className="eyebrow">Account recovery</p>
          <h2>Forgot Password</h2>
          <p className="muted">
            {step === "request"
              ? "Enter your email to receive a secure reset OTP."
              : "Enter the OTP and choose a new password."}
          </p>
        </div>

        {step === "request" ? (
          <>
            <label className="field-group">
              <span>Email</span>
              <input
                value={form.email}
                placeholder="name@example.com"
                autoComplete="email"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <button className={loading ? "loading" : ""} disabled={loading}>
              Send Reset OTP
            </button>
          </>
        ) : (
          <>
            <div className="otp-banner warning-banner">
              <span>🔁</span>
              <p>
                Reset OTP sent to <strong>{form.email}</strong>. Enter it along with your new password.
              </p>
            </div>

            <label className="field-group">
              <span>OTP</span>
              <input
                value={form.otp}
                placeholder="Enter 6-digit OTP"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })}
              />
            </label>

            <label className="field-group">
              <span>New Password</span>
              <input
                value={form.password}
                placeholder="Create a new password"
                type="password"
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>

            <label className="field-group">
              <span>Confirm Password</span>
              <input
                value={form.confirmPassword}
                placeholder="Confirm your new password"
                type="password"
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </label>

            <div className="auth-inline-actions">
              <button type="button" className="secondary-button" onClick={() => setStep("request")}>
                Change email
              </button>
              <button className={loading ? "loading" : ""} disabled={loading}>
                Reset Password
              </button>
            </div>
          </>
        )}

        <p className="auth-footer">
          Remembered it? <Link to="/login">Back to Login</Link>
        </p>
      </form>
    </div>
  );
}