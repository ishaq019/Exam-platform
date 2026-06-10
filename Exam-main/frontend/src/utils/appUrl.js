const KNOWN_ROUTE_ROOTS = new Set([
  'login',
  'register',
  'admin',
  'student',
  'result',
]);

const stripTrailingSlash = (value = '') =>
  value.length > 1 ? value.replace(/\/+$/, '') : value;

const normalizePath = (path = '/') => {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const normalizeBasePath = (value = '/') => {
  if (!value || value === '/') return '/';

  const normalized = normalizePath(value);
  return stripTrailingSlash(normalized) || '/';
};

const detectBasePathFromLocation = () => {
  if (typeof window === 'undefined') return '/';

  const segments = window.location.pathname.split('/').filter(Boolean);
  if (!segments.length) return '/';

  const firstSegment = segments[0];
  if (KNOWN_ROUTE_ROOTS.has(firstSegment)) return '/';

  return `/${firstSegment}`;
};

export const getAppBasePath = () => {
  const envBase =
    import.meta.env.VITE_APP_BASE_PATH ||
    import.meta.env.BASE_URL ||
    '/';

  const normalizedEnvBase = normalizeBasePath(envBase);
  if (normalizedEnvBase !== '/') {
    return normalizedEnvBase;
  }

  return detectBasePathFromLocation();
};

export const getAppRelativePath = (path = '/') => {
  const basePath = getAppBasePath();
  const targetPath = normalizePath(path);

  if (basePath === '/') return targetPath;
  return `${basePath}${targetPath}`;
};

export const getAppAbsoluteUrl = (path = '/') => {
  if (typeof window === 'undefined') return getAppRelativePath(path);
  return new URL(getAppRelativePath(path), window.location.origin).toString();
};