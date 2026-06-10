import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import AppLogo from "./AppLogo";
import ThemeToggle from "./common/ThemeToggle";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const studentLinks = [
    { to: "/student", label: "Dashboard" },
    { to: "/student/exams", label: "Assigned Exams" },
  ];

  const adminLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/exams/create", label: "Create Quiz" },
    { to: "/admin/exams", label: "Manage Quiz" },
    { to: "/admin/surveys", label: "Manage Survey" },
  ];

  const signOut = () => {
    logout();
    navigate("/login");
  };

  const links = user?.role === "admin" ? adminLinks : user?.role === "student" ? studentLinks : [];

  return (
    <nav className="nav">
      <div className="nav-brand-group">
        <Link
          className="nav-brand"
          to={user ? (user.role === "admin" ? "/admin" : "/student") : "/login"}
        >
          <AppLogo size={30} className="nav-brand-logo" />
          <span className="nav-brand-text">
            <span className="nav-brand-name">Quiz App</span>
            <span className="nav-brand-subtitle">Exam management workspace</span>
          </span>
        </Link>
      </div>

      <div className="nav-links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        {user ? (
          <>
            <span className="nav-user">
              <span className="nav-user-name">{user.name}</span>
              <span className="nav-user-role">{user.role}</span>
            </span>
            <button className="nav-button" onClick={signOut}>
              Logout
            </button>
          </>
        ) : (
          <Link className="nav-button nav-button-ghost" to="/login">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
