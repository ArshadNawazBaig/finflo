import api from './axios';

export const membersApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/members', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/members/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/members', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/members/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/members/${id}`);
    return response.data;
  },

  lookup: async (identifier: string) => {
    const response = await api.get(
      `/members/portal/lookup?identifier=${identifier}`,
    );
    return response.data;
  },
};
