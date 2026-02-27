import api from './axios';

export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getMemberStats: async () => {
    // Fetch balances and loans to aggregate stats for the member dashboard
    const [memberRes, loansRes] = await Promise.all([
      api.get('/member-auth/me'),
      api.get('/loans/member/my-loans?limit=1000'), // Adjust path if needed
    ]);

    const member = memberRes.data;
    const loans = loansRes.data?.data || [];

    const activeLoans = loans.filter((l: any) => l.status === 'active');
    const activeLoanAmount = activeLoans.reduce(
      (sum: number, loan: any) => sum + (loan.principal || 0),
      0,
    );

    return {
      success: true,
      data: {
        ...member,
        activeLoanAmount,
        loansCount: activeLoans.length,
      },
    };
  },
};
