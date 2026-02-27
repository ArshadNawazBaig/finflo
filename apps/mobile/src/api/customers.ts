import api from './axios';

export const customersApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  convertToMember: async (id: string, data: any) => {
    const response = await api.post(`/customers/${id}/convert-to-member`, data);
    return response.data;
  },
};
