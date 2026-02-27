import api from './axios';

export const authApi = {
  // Admin / General User Auth
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  forgotPassword: async (data: { email: string }) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (token: string, data: any) => {
    const response = await api.put(`/auth/reset-password/${token}`, data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Member Auth — backend expects { email, password, securityCode }
  memberLogin: async (credentials: {
    email: string;
    password: string;
    securityCode: string;
  }) => {
    const response = await api.post('/member-auth/login', credentials);
    return response.data;
  },

  getMemberMe: async () => {
    const response = await api.get('/member-auth/me');
    return response.data;
  },
};
