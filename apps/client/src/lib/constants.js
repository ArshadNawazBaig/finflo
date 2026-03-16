export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.MODE === 'development'
    ? '' // Empty string = same origin, goes through Vite proxy (/socket.io → 127.0.0.1:5001)
    : window.location.origin);

export const IS_PRODUCTION = import.meta.env.MODE === 'production';
export const MOBILE_PAGE_LIMIT = 5;
export const DESKTOP_PAGE_LIMIT = 10;
