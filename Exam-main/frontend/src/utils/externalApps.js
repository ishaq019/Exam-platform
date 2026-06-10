const trimSlashes = (value = "") => String(value).replace(/^\/+|\/+$/g, "");
const trimTrailingSlash = (value = "") => String(value).replace(/\/+$/, "");

const DEFAULT_SURVEY_LOCAL_URL = "http://localhost:5174";
const DEFAULT_SURVEY_PRODUCTION_PATH = "/survey-app";

const isLocalHost = () =>
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const resolveSurveyBaseUrl = () => {
  const envUrl = import.meta.env.VITE_SURVEY_APP_URL;
  if (envUrl) return trimTrailingSlash(envUrl);

  if (typeof window === "undefined" || isLocalHost()) {
    return DEFAULT_SURVEY_LOCAL_URL;
  }

  return `${window.location.origin}${DEFAULT_SURVEY_PRODUCTION_PATH}`;
};

export const SURVEY_APP_URL = resolveSurveyBaseUrl();

const resolveAbsoluteSurveyBaseUrl = () => {
  if (typeof window === "undefined") {
    return SURVEY_APP_URL;
  }

  return trimTrailingSlash(new URL(`${SURVEY_APP_URL}/`, window.location.origin).toString());
};

const normalizeSurveyPath = (path = "/") => trimSlashes(path || "/");

export const buildSurveyAppUrl = (path = "/", returnUrl, participantId) => {
  const url = new URL(normalizeSurveyPath(path), `${resolveAbsoluteSurveyBaseUrl()}/`);

  if (returnUrl) url.searchParams.set("returnUrl", returnUrl);
  if (participantId) url.searchParams.set("participantId", participantId);

  return url.toString();
};

export const openSurveyApp = (path, returnUrl, participantId) => {
  window.location.href = buildSurveyAppUrl(path, returnUrl, participantId);
};
