import axios from 'axios';
import { toast } from 'sonner';

// Determine the API base URL based on the environment
const isCapacitor =
  !!window.Capacitor ||
  (window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.bridge);

// Production URL where the server is hosted (Update if necessary)
const PROD_API_URL = 'https://loan-master-client.vercel.app/api';

const api = axios.create({
  baseURL: isCapacitor ? PROD_API_URL : '/api',
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // Attempt to get token from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const member = JSON.parse(localStorage.getItem('member') || '{}');

    // Intelligently pick token based on the current route
    const isMemberRoute = window.location.pathname.startsWith('/member/');
    const token = isMemberRoute
      ? member.token || user.token
      : user.token || member.token;

    if (token && typeof token === 'string') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isMemberRoute = window.location.pathname.startsWith('/member/');

      if (isMemberRoute) {
        localStorage.removeItem('member');
        localStorage.removeItem('member');
        // Avoid redirect loop if already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/member/login';
        }
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('user');
        // Avoid redirect loop if already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
