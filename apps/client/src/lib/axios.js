import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: '/api', // Vite proxy handles this
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent due to withCredentials
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
