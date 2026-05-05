import axios from 'axios';
import { getDefaultStore } from 'jotai';
import { memberAtom, userAtom } from '@/atoms';

// Determine the API base URL based on the environment
import { BACKEND_URL } from './constants';

const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : '/api',
  withCredentials: true,
});

// Read token directly from Jotai in-memory store (avoids localStorage timing issues)
const getToken = (isMemberRoute) => {
  const store = getDefaultStore();
  const user = store.get(userAtom);
  const member = store.get(memberAtom);
  return isMemberRoute
    ? member?.token || user?.token
    : user?.token || member?.token;
};

api.interceptors.request.use(
  (config) => {
    const isMemberRoute = window.location.pathname.startsWith('/member/');
    const token = getToken(isMemberRoute);

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
      const store = getDefaultStore();

      if (isMemberRoute) {
        store.set(memberAtom, null);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/member/login';
        }
      } else {
        store.set(userAtom, null);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      // Return a pending promise so calling code doesn't see an error
      // before the page redirect completes
      return new Promise(() => {});
    }
    return Promise.reject(error);
  },
);

export default api;
