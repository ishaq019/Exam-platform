import axios from "axios";
import { API_URL } from "../config/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method === "get") {
    delete config.headers["Content-Type"];
  }
  return config;
});

export default api;
