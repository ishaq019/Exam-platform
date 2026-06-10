import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import AppLogo from "../../components/AppLogo";
import { AuthContext } from "../../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("details");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register/request-otp", form);
      toast.success("OTP sent to your email");
      setStep("otp");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/verify-otp", {
        email: form.email,
        otp,
      });
      toast.success("Registration verified successfully");
      if (data?.user && data?.token) {
        login(data.user, data.token);
      }
      navigate(data?.user?.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card form auth-form" onSubmit={step === "details" ? requestOtp : verifyOtp}>
        <div className="form-heading">
          <div className="auth-logo-wrap">
            <AppLogo size={52} />
          </div>
          <p className="eyebrow">Create account</p>
          <h2>Register</h2>
          <p className="muted">
            {step === "details"
              ? "Enter your details and we will send a secure OTP to your email."
              : "Check your inbox and enter the 6-digit OTP to complete registration."}
          </p>
        </div>

        {step === "details" ? (
          <>
            <label className="field-group">
              <span>Name</span>
              <input
                value={form.name}
                placeholder="Your full name"
                autoComplete="name"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

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
                placeholder="Create a password"
                type="password"
                autoComplete="new-password"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>

            <label className="field-group">
              <span>Role</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <button className={loading ? "loading" : ""} disabled={loading}>
              Send OTP
            </button>
          </>
        ) : (
          <>
            <div className="otp-banner success-banner">
              <span>📩</span>
              <p>
                OTP sent to <strong>{form.email}</strong>. It may take a few moments to arrive.
              </p>
            </div>

            <label className="field-group">
              <span>OTP</span>
              <input
                value={otp}
                placeholder="Enter 6-digit OTP"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
            </label>

            <div className="auth-inline-actions">
              <button type="button" className="secondary-button" onClick={() => setStep("details")}>
                Edit details
              </button>
              <button className={loading ? "loading" : ""} disabled={loading}>
                Verify & Register
              </button>
            </div>
          </>
        )}

        <p className="auth-footer">
          Already have account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
