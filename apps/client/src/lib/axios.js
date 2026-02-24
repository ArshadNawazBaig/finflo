import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: '/api', // Vite proxy handles this
});

api.interceptors.request.use(
  (config) => {
    const isMemberRoute = window.location.pathname.startsWith('/member/');
    const token = isMemberRoute
      ? localStorage.getItem('memberToken')
      : localStorage.getItem('token');

    if (token) {
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
        localStorage.removeItem('memberToken');
        localStorage.removeItem('member');
        // Avoid redirect loop if already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/member/login';
        }
      } else {
        localStorage.removeItem('token');
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
