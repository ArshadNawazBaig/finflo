import api from './axios';

export const transactionsApi = {
  getAll: async (params?: any) => {
    const response = await api.get('/ledger', { params });
    return response.data;
  },

  getMemberTransactions: async (params?: any) => {
    const response = await api.get('/ledger/member/my-transactions', {
      params,
    });
    return response.data;
  },
};
