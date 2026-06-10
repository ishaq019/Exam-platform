const crypto = require("crypto");
const nodemailer = require("nodemailer");

const logger = require("./logger");

const EMAIL_USER = process.env.EMAIL_USER || process.env.MAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.MAIL_PASS || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || EMAIL_USER;
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Quiz Application";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true";

const transporter = EMAIL_USER && EMAIL_PASS
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    })
  : null;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const percentageFromScore = (score, totalMarks) => {
  if (!totalMarks) return 0;
  return Number(((Number(score) / Number(totalMarks)) * 100).toFixed(2));
};

const emailShell = ({ title, accent, badge, body }) => `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:720px;margin:0 auto;padding:32px 16px;">
      <div style="background:linear-gradient(135deg, ${accent} 0%, #0f172a 100%);border-radius:24px;padding:28px;color:#ffffff;box-shadow:0 16px 40px rgba(15,23,42,.18);">
        <div style="display:inline-block;background:rgba(255,255,255,.18);border-radius:999px;padding:8px 14px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
          ${badge}
        </div>
        <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;">${title}</h1>
        <p style="margin:0;color:rgba(255,255,255,.88);font-size:15px;line-height:1.6;">${body}</p>
      </div>
    </div>
  </div>`;

const card = (rows) => `
  <div style="background:#ffffff;border-radius:24px;padding:28px;margin-top:-18px;border:1px solid #e5eaf2;box-shadow:0 12px 34px rgba(15,23,42,.08);">
    ${rows}
  </div>`;

const infoRow = (label, value) => `
  <div style="display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #eef2f7;font-size:14px;line-height:1.6;">
    <span style="color:#64748b;font-weight:700;">${label}</span>
    <span style="color:#0f172a;font-weight:700;text-align:right;">${value}</span>
  </div>`;

const sendMail = async ({ to, subject, html, text }) => {
  if (!transporter || !to) {
    logger.warn(`Email skipped for ${subject || "untitled message"} because mail config is missing.`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `${FROM_NAME} <${EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    logger.warn(`Failed to send email to ${to}:`, error.message);
    return false;
  }
};

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const sendRegistrationOtpEmail = async ({ name, email, otp }) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeOtp = escapeHtml(otp);

  const html = `
    ${emailShell({
      title: `🔐 Your verification code is ready, ${safeName}`,
      accent: "#2563eb",
      badge: "New Account OTP",
      body: "Use the one-time password below to keep your registration secure. This code is valid for a short time and should never be shared with anyone.",
    })}
    <div style="max-width:720px;margin:0 auto;padding:0 16px 32px;">
      ${card(`
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">
          Hi ${safeName}, welcome aboard ✨ We generated a one-time password for your new account.
        </p>
        <div style="text-align:center;background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 100%);border:1px solid #bfdbfe;border-radius:20px;padding:24px;margin:22px 0;">
          <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#1d4ed8;font-weight:800;margin-bottom:10px;">Your OTP</div>
          <div style="font-size:40px;letter-spacing:10px;font-weight:900;color:#0f172a;">${safeOtp}</div>
        </div>
        <div style="background:#f8fafc;border-radius:18px;padding:18px 20px;margin-top:18px;">
          ${infoRow("Email", safeEmail)}
          ${infoRow("Expires", "Shortly after delivery")}
          ${infoRow("Security", "Do not share this code with anyone")}
        </div>
        <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.7;">
          If you did not request this account, you can safely ignore this email.
        </p>
      `)}
    </div>`;

  const text = [
    `Welcome ${name}!`,
    `Your registration OTP is: ${otp}`,
    `Email: ${email}`,
    "Do not share this code with anyone.",
  ].join("\n");

  return sendMail({
    to: email,
    subject: "🔐 Your Quiz Application OTP Code",
    html,
    text,
  });
};

const buildExamReportEmail = ({ recipientName, examTitle, studentName, studentEmail, score, totalMarks, attemptNumber, submittedAt, role }) => {
  const percentage = percentageFromScore(score, totalMarks);
  const accent = role === "admin" ? "#7c3aed" : "#059669";
  const headerTitle =
    role === "admin"
      ? `📊 Exam completed by ${escapeHtml(studentName)}`
      : `🎉 Your exam report is ready, ${escapeHtml(recipientName)}`;
  const headerBody =
    role === "admin"
      ? "A learner has completed the exam. Here is a concise result summary for review and tracking."
      : "You have successfully submitted your exam. Below is a quick summary of your performance and attempt details.";

  const details = role === "admin"
    ? `
        ${infoRow("Student", escapeHtml(studentName))}
        ${infoRow("Student Email", escapeHtml(studentEmail))}
        ${infoRow("Attempt", `#${escapeHtml(attemptNumber)}`)}
        ${infoRow("Submitted At", escapeHtml(formatDateTime(submittedAt)))}
      `
    : `
        ${infoRow("Attempt", `#${escapeHtml(attemptNumber)}`)}
        ${infoRow("Submitted At", escapeHtml(formatDateTime(submittedAt)))}
        ${infoRow("Email", escapeHtml(studentEmail))}
      `;

  const html = `
    ${emailShell({
      title: headerTitle,
      accent,
      badge: role === "admin" ? "Admin Result Alert" : "Student Result Summary",
      body: headerBody,
    })}
    <div style="max-width:720px;margin:0 auto;padding:0 16px 32px;">
      ${card(`
        <div style="margin-bottom:18px;">
          <div style="font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${accent};margin-bottom:8px;">Exam Report</div>
          <h2 style="margin:0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(examTitle)}</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0 18px;">
          <div style="background:#f8fafc;border-radius:18px;padding:18px;border:1px solid #e2e8f0;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">Score</div>
            <div style="font-size:30px;font-weight:900;color:${accent};margin-top:8px;">${escapeHtml(score)}</div>
          </div>
          <div style="background:#f8fafc;border-radius:18px;padding:18px;border:1px solid #e2e8f0;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">Total</div>
            <div style="font-size:30px;font-weight:900;color:#0f172a;margin-top:8px;">${escapeHtml(totalMarks)}</div>
          </div>
          <div style="background:linear-gradient(135deg,#ecfeff 0%,#f0fdfa 100%);border-radius:18px;padding:18px;border:1px solid #99f6e4;text-align:center;">
            <div style="font-size:12px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:.08em;">Percentage</div>
            <div style="font-size:30px;font-weight:900;color:#0f766e;margin-top:8px;">${escapeHtml(percentage)}%</div>
          </div>
        </div>
        <div style="background:#f8fafc;border-radius:18px;padding:18px 20px;">
          ${details}
        </div>
        <div style="margin-top:18px;padding:16px 18px;border-radius:18px;background:${role === "admin" ? "#f5f3ff" : "#ecfdf5"};border:1px solid ${role === "admin" ? "#ddd6fe" : "#bbf7d0"};color:#334155;line-height:1.7;font-size:14px;">
          ${role === "admin"
            ? "This summary is designed to support fast review and record keeping. You can open the admin dashboard for full report details and attempt history."
            : "Great work. You can log in to review your progress, revisit attempts, and continue learning with confidence."}
        </div>
      `)}
    </div>`;

  const text = [
    role === "admin"
      ? `Exam completed by ${studentName}`
      : `Your exam report for ${examTitle}`,
    `Score: ${score}/${totalMarks}`,
    `Percentage: ${percentage}%`,
    `Attempt: #${attemptNumber}`,
    `Submitted At: ${formatDateTime(submittedAt)}`,
  ].join("\n");

  return {
    subject:
      role === "admin"
        ? `📊 Exam completed: ${examTitle}`
        : `🎉 Your exam report: ${examTitle}`,
    html,
    text,
  };
};

const sendExamReportEmail = async ({
  to,
  recipientName,
  examTitle,
  studentName,
  studentEmail,
  score,
  totalMarks,
  attemptNumber,
  submittedAt,
  role,
}) => {
  const message = buildExamReportEmail({
    recipientName,
    examTitle,
    studentName,
    studentEmail,
    score,
    totalMarks,
    attemptNumber,
    submittedAt,
    role,
  });

  return sendMail({
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
};

module.exports = {
  ADMIN_EMAIL,
  generateOtp,
  sendRegistrationOtpEmail,
  sendExamReportEmail,
};