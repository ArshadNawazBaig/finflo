export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'development'
    ? 'http://127.0.0.1:5001'
    : window.location.origin);

export const IS_PRODUCTION = import.meta.env.MODE === 'production';
