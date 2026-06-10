const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

export const API_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
);
