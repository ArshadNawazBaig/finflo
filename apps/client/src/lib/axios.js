import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy handles this
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const memberToken = localStorage.getItem('memberToken');

    // Prioritize memberToken if on a member route, otherwise use token
    const finalToken = window.location.pathname.startsWith('/member')
      ? memberToken || token
      : token || memberToken;

    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
