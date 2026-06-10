const trimSlashes = (value = "") => String(value).replace(/^\/+|\/+$/g, "");

const normalizeBasePath = (value = "/") => {
  const cleaned = trimSlashes(value);
  return cleaned ? `/${cleaned}` : "/";
};

const normalizePath = (path = "") => {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
};

export const APP_BASE_PATH = normalizeBasePath(
  import.meta.env.VITE_APP_BASE_PATH || import.meta.env.BASE_URL || "/"
);

export const buildAppPath = (path = "") => {
  const normalizedPath = normalizePath(path);

  if (APP_BASE_PATH === "/") {
    return normalizedPath || "/";
  }

  return `${APP_BASE_PATH}${normalizedPath}`;
};

export const buildAppUrl = (path = "") => {
  if (typeof window === "undefined") {
    return buildAppPath(path);
  }

  return new URL(buildAppPath(path), window.location.origin).toString();
};
