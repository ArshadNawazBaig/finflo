import api from './axios';

export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getMemberStats: async () => {
    // Note: Assuming there's a member dashboard endpoint, adjust if it's different
    const response = await api.get('/dashboard/member-stats');
    return response.data;
  },
};
