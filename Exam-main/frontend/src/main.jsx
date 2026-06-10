import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { APP_BASE_PATH } from "./utils/appPaths";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter basename={APP_BASE_PATH}>
    <ThemeProvider>
      <AuthProvider>
        <App />
        <ToastContainer position="top-right" autoClose={2000} />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
