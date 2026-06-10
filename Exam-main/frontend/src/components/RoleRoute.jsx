import React from "react";
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function RoleRoute({ role, children }) {
  const { user } = useContext(AuthContext);
  return user?.role === role ? children : <Navigate to="/login" />;
}
