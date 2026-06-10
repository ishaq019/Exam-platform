import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";

import AdminDashboard from "../pages/admin/AdminDashboard";
import CreateExam from "../pages/admin/CreateExam";
import ExamList from "../pages/admin/ExamList";
import AddQuestions from "../pages/admin/AddQuestions";
import AssignStudents from "../pages/admin/AssignStudents";
import ExamReport from "../pages/admin/ExamReport";
import EditExam from "../pages/admin/EditExam";
import ManageSurvey from "../pages/admin/ManageSurvey";

import StudentDashboard from "../pages/student/StudentDashboard";
import AssignedExams from "../pages/student/AssignedExams";
import AttemptQuiz from "../pages/student/AttemptQuiz";
import Result from "../pages/student/Result";

import ProtectedRoute from "../components/ProtectedRoute";
import RoleRoute from "../components/RoleRoute";

const adminRoute = (component) => (
  <ProtectedRoute>
    <RoleRoute role="admin">{component}</RoleRoute>
  </ProtectedRoute>
);

const studentRoute = (component) => (
  <ProtectedRoute>
    <RoleRoute role="student">{component}</RoleRoute>
  </ProtectedRoute>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/admin" element={adminRoute(<AdminDashboard />)} />
      <Route path="/admin/exams" element={adminRoute(<ExamList />)} />
      <Route path="/admin/exams/create" element={adminRoute(<CreateExam />)} />
      <Route path="/admin/surveys" element={adminRoute(<ManageSurvey />)} />
      <Route path="/admin/exams/:examId/edit" element={adminRoute(<EditExam />)} />
      <Route
        path="/admin/exams/:examId/questions"
        element={adminRoute(<AddQuestions />)}
      />
      <Route
        path="/admin/exams/:examId/assign"
        element={adminRoute(<AssignStudents />)}
      />
      <Route
        path="/admin/exams/:examId/report"
        element={adminRoute(<ExamReport />)}
      />

      <Route path="/student" element={studentRoute(<StudentDashboard />)} />
      <Route path="/student/exams" element={studentRoute(<AssignedExams />)} />

      <Route
        path="/student/exams/:examId/attempt"
        element={studentRoute(<AttemptQuiz />)}
      />

      <Route path="/result" element={studentRoute(<Result />)} />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}