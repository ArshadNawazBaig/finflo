import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  FileText,
  Plus,
  PieChart,
  Target,
  ArrowRight,
  Download,
  Send,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import MemberLoanRequestModal from '@/components/MemberLoanRequestModal';
import WealthInsights from '@/components/WealthInsights';
import SavingGoalsList from '@/components/SavingGoalsList';
import CreateSavingGoalModal from '@/components/CreateSavingGoalModal';
import ContributeGoalModal from '@/components/ContributeGoalModal';
import InfiniteLoader from '@/components/InfiniteLoader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR, capitalize } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import UITooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MemberDashboard = () => {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loans, setLoans] = useState([]);
  const [grantorLoans, setGrantorLoans] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Pagination & Mobile State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(5);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const observerTarget = useRef(null);

  const fetchDashboardData = useCallback(
    async (isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
          setCurrentPage(1);
        } else {
          setIsFetchingMore(true);
        }

        const memberToken = localStorage.getItem('memberToken');
        const pageToFetch = isAppend ? currentPage + 1 : 1;

        if (!isAppend) {
          const [memberRes, goalsRes, activityRes, grantorLoansRes] =
            await Promise.all([
              api.get('/member-auth/me', {
                headers: { Authorization: `Bearer ${memberToken}` },
              }),
              api.get('/saving-goals', {
                headers: { Authorization: `Bearer ${memberToken}` },
              }),
              api.get('/members/portal/activity?limit=100', {
                headers: { Authorization: `Bearer ${memberToken}` },
              }),
              api.get('/loans/grantor-loans', {
                headers: { Authorization: `Bearer ${memberToken}` },
              }),
            ]);
          setMember(memberRes.data);
          setGoals(goalsRes.data);
          setActivity(activityRes.data.data || []);
          setGrantorLoans(grantorLoansRes.data || []);
        }

        const { data: response } = await api.get(
          `/loans/my-loans?page=${pageToFetch}&limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${memberToken}` },
          },
        );

        const newLoans = response.data || [];

        if (isAppend) {
          setLoans((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const filtered = newLoans.filter((l) => !existingIds.has(l._id));
            return [...prev, ...filtered];
          });
          setCurrentPage(pageToFetch);
        } else {
          setLoans(newLoans);
        }

        setTotalPages(response.totalPages || 0);
        setTotalEntries(response.totalEntries || 0);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage],
  );

  const handleGrantorStatus = async (loanId, status) => {
    try {
      const memberToken = localStorage.getItem('memberToken');
      await api.patch(
        `/loans/${loanId}/grantor-status`,
        { status },
        { headers: { Authorization: `Bearer ${memberToken}` } },
      );
      toast.success(`Loan request ${status} successfully`);
      fetchDashboardData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [limit]);

  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchDashboardData(true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchDashboardData]);

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to remove this goal?')) return;
    try {
      const memberToken = localStorage.getItem('memberToken');
      await api.delete(`/saving-goals/${id}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      setGoals(goals.filter((g) => g._id !== id));
      toast.success('Goal removed successfully');
    } catch (error) {
      toast.error('Failed to remove goal');
    }
  };

  // Format large numbers for chart display
  const formatChartValue = (value) => {
    value = Math.ceil(value);
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    return value.toLocaleString();
  };

  const getChartData = () => {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6Months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        inflow: 0,
        outflow: 0,
      });
    }

    activity.forEach((item) => {
      const date = new Date(item.date);
      const monthIndex = last6Months.findIndex(
        (m) => m.monthNum === date.getMonth() && m.year === date.getFullYear(),
      );

      if (monthIndex !== -1 && item.amount) {
        const amount = parseFloat(item.amount) || 0;

        // Categorize based on type field
        if (item.type === 'deposit' || item.type === 'transfer_receive') {
          last6Months[monthIndex].inflow += amount;
        } else if (
          item.type === 'withdrawal' ||
          item.type === 'transfer_send'
        ) {
          last6Months[monthIndex].outflow += amount;
        }
      }
    });

    return last6Months;
  };

  const activeLoansCount = loans.filter((l) => l.status === 'active').length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title="Wealth Portal"
        description={`Welcome back, ${capitalize(member?.name)}. Manage your wealth and financial targets.`}
      />

      {loading && loans.length === 0 ? (
        <CardsSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <StatsCard
              title="Main Balance"
              amount={formatPKR(member?.currentBalance || 0)}
              icon={<Wallet size={20} />}
              color="bg-primary shadow-primary/20"
            />
            <StatsCard
              title="Total Invested"
              amount={formatPKR(member?.totalInvested || 0)}
              icon={<TrendingUp size={20} />}
              color="bg-emerald-500 shadow-emerald-500/20"
            />
            <StatsCard
              title="Total Profit"
              amount={formatPKR(member?.totalProfit || 0)}
              icon={<PieChart size={20} />}
              color="bg-blue-500 shadow-blue-500/20"
            />
            <StatsCard
              title="Active Loans"
              amount={activeLoansCount}
              icon={<FileText size={20} />}
              color="bg-amber-500 shadow-amber-500/20"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start">
            <Button
              onClick={() => setIsRequestModalOpen(true)}
              variant="gradient"
              className="px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-primary/20"
            >
              <Plus size={18} strokeWidth={3} />
              New Request
            </Button>
            <Button
              onClick={() => navigate('/member/transfer')}
              className="px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border-2 border-primary/20 bg-primary transition-all"
            >
              <Send size={18} />
              Transfer Funds
            </Button>
            <Button
              onClick={() => setIsGoalModalOpen(true)}
              className="px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 transition-all"
            >
              <Target size={18} />
              New Goal
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <WealthInsights member={member} loans={loans} goals={goals} />

              <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8 mt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter">
                      Cash Flow
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      Inflow vs Outflow (Last 6 Months)
                    </p>
                  </div>
                  <Link
                    to="/member/transactions"
                    className="p-3 bg-muted hover:bg-muted/80 rounded-2xl transition-all group"
                  >
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 'bold' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 'bold' }}
                        tickFormatter={formatChartValue}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '1rem',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                        formatter={(value) => formatPKR(value)}
                      />
                      <Bar
                        dataKey="inflow"
                        fill="#10b981"
                        radius={[10, 10, 0, 0]}
                      />
                      <Bar
                        dataKey="outflow"
                        fill="#f43f5e"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {grantorLoans.length > 0 && (
                <div className="p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 bg-primary/5">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter text-primary">
                      Loans Pending My Approval (Grantor)
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      You have been requested as a grantor for these loans.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {grantorLoans.map((loan) => (
                      <div
                        key={loan._id}
                        className="p-6 rounded-[2rem] border border-border/50 bg-card hover:bg-muted/30 transition-all group"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-lg">
                                {loan.customer?.name} -{' '}
                                {formatPKR(loan.principal)}
                              </h4>
                              {loan.grantorStatus === 'pending' && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600">
                                  Your Approval Required
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                              Duration: {loan.duration} months | Amount:{' '}
                              {formatPKR(loan.principal)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() =>
                                handleGrantorStatus(loan._id, 'approved')
                              }
                              variant="outline"
                              className="rounded-full text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() =>
                                handleGrantorStatus(loan._id, 'rejected')
                              }
                              variant="outline"
                              className="rounded-full text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter">
                      My Loan Requests
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      View and manage all your loan applications
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/member/loans"
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline px-4 py-2 bg-primary/5 rounded-full transition-all"
                    >
                      View All
                    </Link>
                    <Button
                      variant="gradient"
                      className="rounded-full gap-2 text-xs font-black uppercase tracking-widest px-6 py-3"
                      onClick={() => setIsRequestModalOpen(true)}
                    >
                      <Plus size={16} strokeWidth={3} /> Request Loan
                    </Button>
                  </div>
                </div>

                {loans.length === 0 && !loading ? (
                  <EmptyState
                    icon={FileText}
                    title="No Loans Yet"
                    description="You haven't requested any loans yet."
                    className="border-none bg-card/50"
                  />
                ) : (
                  <div className="space-y-3">
                    {loans.map((loan) => (
                      <div
                        key={loan._id}
                        onClick={() => navigate(`/member/loans/${loan._id}`)}
                        className="p-6 rounded-[2rem] border border-border/50 hover:bg-muted/30 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-lg">
                                {formatPKR(loan.principal)} Loan
                              </h4>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                  loan.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : loan.status === 'pending'
                                      ? loan.grantorStatus === 'pending'
                                        ? 'bg-blue-500/10 text-blue-600'
                                        : 'bg-amber-500/10 text-amber-600'
                                      : loan.status === 'completed'
                                        ? 'bg-blue-500/10 text-blue-600'
                                        : 'bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-muted-foreground/80'
                                }`}
                              >
                                {loan.status === 'pending' &&
                                loan.grantorStatus === 'pending'
                                  ? 'Pending Grantor'
                                  : loan.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                              {loan.duration} months @ {loan.rate}% interest
                            </p>
                            {loan.status === 'active' && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs font-bold mb-1">
                                  <span className="text-muted-foreground">
                                    Remaining
                                  </span>
                                  <span>
                                    {formatPKR(
                                      loan.remainingAmount || loan.totalAmount,
                                    )}
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all"
                                    style={{
                                      width: `${100 - ((loan.remainingAmount || loan.totalAmount) / loan.totalAmount) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <UITooltip content="Download Statement">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportLoanStatement(
                                    loan,
                                    loan.repayments || [],
                                    member,
                                  );
                                }}
                                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                              >
                                <Download size={16} />
                              </button>
                            </UITooltip>
                            <ArrowRight
                              className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all"
                              size={20}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {isMobile ? (
                      currentPage < totalPages && (
                        <div ref={observerTarget}>
                          <InfiniteLoader isFetchingMore={isFetchingMore} />
                        </div>
                      )
                    ) : (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalEntries={totalEntries}
                        limit={limit}
                        onPageChange={(p) => {
                          setCurrentPage(p);
                          // For desktop pagination, we want to scroll to top of section or just fetch
                          const memberToken =
                            localStorage.getItem('memberToken');
                          api
                            .get(`/loans/my-loans?page=${p}&limit=${limit}`, {
                              headers: {
                                Authorization: `Bearer ${memberToken}`,
                              },
                            })
                            .then(({ data: response }) => {
                              setLoans(response.data || []);
                              setCurrentPage(p);
                            });
                        }}
                        onLimitChange={(l) => {
                          setLimit(l);
                          setCurrentPage(1);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-10">
                <div className="bg-card p-8 rounded-[2.5rem] border border-border/50 shadow-sm h-full">
                  <SavingGoalsList
                    goals={goals}
                    onAddGoal={() => setIsGoalModalOpen(true)}
                    onDeleteGoal={handleDeleteGoal}
                    onContribute={(goal) => {
                      setSelectedGoal(goal);
                      setIsContributeModalOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <MemberLoanRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => fetchDashboardData(false)}
      />
      <CreateSavingGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSuccess={() => fetchDashboardData(false)}
      />
      {selectedGoal && (
        <ContributeGoalModal
          isOpen={isContributeModalOpen}
          onClose={() => setIsContributeModalOpen(false)}
          goal={selectedGoal}
          memberBalance={member?.currentBalance || 0}
          onSuccess={() => fetchDashboardData(false)}
        />
      )}
    </div>
  );
};

export default MemberDashboard;
