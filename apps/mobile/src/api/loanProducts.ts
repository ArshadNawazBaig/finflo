import api from './axios';

export const loanProductsApi = {
  getAll: async () => {
    const response = await api.get('/loan-products');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/loan-products/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/loan-products', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/loan-products/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/loan-products/${id}`);
    return response.data;
  },
};
