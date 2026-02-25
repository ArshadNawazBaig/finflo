import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In development, this should point to your local machine's IP address, not localhost.
// e.g., 'http://192.168.1.100:5000/api/v1'
// Replace this with your actual local IP or production URL.
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.7:5001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      // Check if it's a member request to use the member token
      const isMemberRoute = config.url?.includes('/member');
      const tokenKey = isMemberRoute ? 'member_token' : 'token';
      const token = await AsyncStorage.getItem(tokenKey);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access (e.g., clear tokens and navigate to login)
      // This is usually best handled at the context level by observing a custom event
      // or by simply rejecting and letting the specific API call catch it.
    }
    return Promise.reject(error);
  },
);

export default api;
