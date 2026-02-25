import api from './axios';

export const loansApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/loans', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/loans/${id}`);
    return response.data;
  },

  getMemberLoans: async () => {
    const response = await api.get('/loans/member/my-loans');
    return response.data;
  },

  requestLoan: async (data: any) => {
    const response = await api.post('/loans/request', data);
    return response.data;
  },

  approveReq: async (id: string) => {
    const response = await api.put(`/loans/request/${id}/approve`);
    return response.data;
  },

  rejectReq: async (id: string, data: any) => {
    const response = await api.put(`/loans/request/${id}/reject`, data);
    return response.data;
  },

  repay: async (id: string, data: any) => {
    const response = await api.post(`/loans/${id}/repay`, data);
    return response.data;
  },
};
