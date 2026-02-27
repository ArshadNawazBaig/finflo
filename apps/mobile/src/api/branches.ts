import api from './axios';

export const branchesApi = {
  getAll: async () => {
    const response = await api.get('/branches');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/branches/${id}`);
    return response.data;
  },
};
