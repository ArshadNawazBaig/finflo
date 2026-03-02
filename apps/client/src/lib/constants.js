export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:5001'
    : window.location.origin);

export const IS_PRODUCTION = import.meta.env.MODE === 'production';
