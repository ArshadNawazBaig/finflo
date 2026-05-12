import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { memberAtom } from '@/atoms';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Plus,
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
import PageHeader from '@/components/PageHeader';
import { MemberDashboardSkeleton } from '@/components/ui/PageSkeletons';
import MemberLoanRequestModal from '@/components/member/MemberLoanRequestModal';
import CreditScoreCard from '@/components/member/CreditScoreCard';
import FinancialHealthCard from '@/components/member/FinancialHealthCard';
import AccountOverviewCard from '@/components/member/AccountOverviewCard';
import FinancialCalendar from '@/components/member/FinancialCalendar';
import SavingGoalsList from '@/components/savings/SavingGoalsList';
import CreateSavingGoalModal from '@/components/savings/CreateSavingGoalModal';
import ContributeGoalModal from '@/components/savings/ContributeGoalModal';

import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import UITooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MemberDashboard = () => {
  const navigate = useNavigate();
  const [member, setMember] = useAtom(memberAtom);
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
  const skipNextEffect = useRef(false);

  const fetchDashboardData = useCallback(
    async (isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
          setCurrentPage(1);
        } else {
          setIsFetchingMore(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : 1;

        if (!isAppend) {
          const [memberRes, goalsRes, activityRes, grantorLoansRes] =
            await Promise.all([
              api.get('/member-auth/me', {
                headers: {
                  /* Auth header handled by browser cookies */
                },
              }),
              api.get('/saving-goals', {
                headers: {
                  /* Auth header handled by browser cookies */
                },
              }),
              api.get('/members/portal/activity?limit=100', {
                headers: {
                  /* Auth header handled by browser cookies */
                },
              }),
              api.get('/loans/grantor-loans', {
                headers: {
                  /* Auth header handled by browser cookies */
                },
              }),
            ]);
          // memberAtom (atomWithStorage) handles localStorage sync
          setMember((prev) => ({ ...prev, ...memberRes.data }));
          setGoals(goalsRes.data);
          setActivity(activityRes.data.data || []);
          setGrantorLoans(grantorLoansRes.data || []);
        }

        const { data: response } = await api.get(
          `/loans/my-loans?page=${pageToFetch}&limit=${limit}`,
          {
            headers: {
              /* Auth header handled by browser cookies */
            },
          },
        );

        const newLoans = response.data || [];

        if (isAppend) {
          setLoans((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const filtered = newLoans.filter((l) => !existingIds.has(l._id));
            return [...prev, ...filtered];
          });
          skipNextEffect.current = true;
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
      await api.patch(
        `/loans/${loanId}/grantor-status`,
        { status },
        {
          headers: {
            /* Auth header handled by browser cookies */
          },
        },
      );
      toast.success(`Loan request ${status} successfully`);
      fetchDashboardData(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }
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
      await api.delete(`/saving-goals/${id}`, {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      setGoals(goals.filter((g) => g._id !== id));
      toast.success('Goal removed successfully');
    } catch (error) {
      toast.error('Failed to remove goal');
    }
  };

  // Format large numbers for chart display
  const formatChartValue = (value) => {
    value = Math.round(value);
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
  const isProPlan =
    (member?.plan === 'Pro' || member?.adminPlan === 'Pro') &&
    (member?.subscriptionStatus === 'active' || !member?.subscriptionStatus);

  const businessName = isProPlan
    ? member?.businessName || member?.user?.businessName || 'FinFlo'
    : 'FinFlo';

  if (loading && loans.length === 0) {
    return <MemberDashboardSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title={`${businessName} Portal`}
        description={`Welcome back, ${capitalize(member?.name)}. Manage your finances and financial targets.`}
      />

      {/* Credit Score, Financial Health & Account Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <CreditScoreCard creditScore={member?.creditScore || { score: 550, grade: 'Fair', factors: ['No credit history yet — build your profile over time'] }} />
            <FinancialHealthCard
              member={member}
              activeLoansCount={activeLoansCount}
            />
            <AccountOverviewCard member={member} />
          </div>

          {/* Financial Calendar — full width */}
          <FinancialCalendar className="my-8" />

          <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start">
            <Button
              onClick={() => setIsRequestModalOpen(true)}
              variant="gradient"
              className="px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-primary/20 w-full sm:w-auto"
            >
              <Plus size={18} strokeWidth={3} />
              New Request
            </Button>
            <Button
              onClick={() => navigate('/member/transfer')}
              className="px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border-2 border-primary/20 bg-primary transition-all w-full sm:w-auto"
            >
              <Send size={18} />
              Transfer Funds
            </Button>
            <Button
              onClick={() => setIsGoalModalOpen(true)}
              className="px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 border-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 transition-all w-full sm:w-auto"
            >
              <Target size={18} />
              New Goal
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8">
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
                <div className="h-[300px] w-full outline-none focus:outline-none">
                  <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                    <BarChart
                      data={getChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      style={{ outline: 'none' }}
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
                        formatter={(value) => formatCurrency(value)}
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

              {grantorLoans.some((l) => {
                const g1Id = l.grantor1?._id || l.grantor1;
                const g2Id = l.grantor2?._id || l.grantor2;
                return (
                  l.status === 'pending' &&
                  ((g1Id?.toString() === member?._id?.toString() &&
                    l.grantor1Status === 'pending') ||
                    (g2Id?.toString() === member?._id?.toString() &&
                      l.grantor2Status === 'pending'))
                );
              }) && (
                <div className="p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 bg-primary/10 transition-all duration-500">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter text-primary">
                      Loans Pending My Approval (Grantor)
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      You have been requested as a grantor for these loans.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {grantorLoans
                      .filter((loan) => {
                        const g1Id = loan.grantor1?._id || loan.grantor1;
                        const g2Id = loan.grantor2?._id || loan.grantor2;
                        return (
                          loan.status === 'pending' &&
                          ((g1Id?.toString() === member?._id?.toString() &&
                            loan.grantor1Status === 'pending') ||
                            (g2Id?.toString() === member?._id?.toString() &&
                              loan.grantor2Status === 'pending'))
                        );
                      })
                      .map((loan) => (
                        <div
                          key={loan._id}
                          className="p-6 rounded-[2rem] border border-border/50 bg-card hover:bg-muted/30 transition-all group"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-lg capitalize">
                                  {loan.customer?.name} -{' '}
                                  {formatCurrency(loan.principal)}
                                </h4>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600">
                                  Your Approval Required
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Duration: {loan.duration} months | Amount:{' '}
                                {formatCurrency(loan.principal)}
                              </p>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-4 sm:pt-0 border-t sm:border-transparent border-border/10 mt-2 sm:mt-0">
                              <Button
                                onClick={() =>
                                  handleGrantorStatus(loan._id, 'approved')
                                }
                                variant="outline"
                                className="flex-1 sm:flex-none rounded-full text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() =>
                                  handleGrantorStatus(loan._id, 'rejected')
                                }
                                variant="outline"
                                className="flex-1 sm:flex-none rounded-full text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
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

              {grantorLoans.some(
                (l) =>
                  (l.grantor1?._id === member?._id &&
                    l.grantor1Status !== 'pending') ||
                  (l.grantor2?._id === member?._id &&
                    l.grantor2Status !== 'pending'),
              ) && (
                <div className="p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 bg-muted/20">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter">
                      My Grantor History
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      History of loans where you served as a grantor.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {grantorLoans
                      .filter((loan) => {
                        const g1Id = loan.grantor1?._id || loan.grantor1;
                        const g2Id = loan.grantor2?._id || loan.grantor2;
                        return (
                          (g1Id?.toString() === member?._id?.toString() &&
                            loan.grantor1Status !== 'pending') ||
                          (g2Id?.toString() === member?._id?.toString() &&
                            loan.grantor2Status !== 'pending')
                        );
                      })
                      .map((loan) => {
                        const g1Id = loan.grantor1?._id || loan.grantor1;
                        const myStatus =
                          g1Id?.toString() === member?._id?.toString()
                            ? loan.grantor1Status
                            : loan.grantor2Status;
                        return (
                          <div
                            key={loan._id}
                            className="p-6 rounded-[2rem] border border-border/50 bg-card/60 backdrop-blur-sm transition-all"
                          >
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 mb-2">
                                  <h4 className="font-bold text-lg capitalize leading-tight">
                                    {loan.customer?.name} -{' '}
                                    {formatCurrency(loan.principal)}
                                  </h4>
                                  <span
                                    className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                      myStatus === 'approved'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-rose-500/10 text-rose-600'
                                    }`}
                                  >
                                    {myStatus}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">
                                  Duration: {loan.duration} months | Loan
                                  Status: {capitalize(loan.status)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 mb-2">
                              <h4 className="font-bold text-lg leading-tight">
                                {formatCurrency(loan.principal)} Loan
                              </h4>
                              <span
                                className={`shrink-0 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  loan.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : loan.status === 'pending'
                                      ? loan.grantor1Status === 'pending' ||
                                        loan.grantor2Status === 'pending'
                                        ? 'bg-blue-500/10 text-blue-600'
                                        : 'bg-amber-500/10 text-amber-600'
                                      : loan.status === 'completed'
                                        ? 'bg-blue-500/10 text-blue-600'
                                        : 'bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-muted-foreground/80'
                                }`}
                              >
                                {loan.status === 'pending' &&
                                (loan.grantor1Status === 'pending' ||
                                  loan.grantor2Status === 'pending')
                                  ? 'Pending Grantor'
                                  : loan.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                              {loan.duration} months @ {loan.rate}% interest
                            </p>
                            {loan.grantor1 && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Grantor 1:
                                </span>
                                <span className="text-xs font-bold capitalize">
                                  {loan.grantor1.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                    loan.grantor1Status === 'approved'
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : loan.grantor1Status === 'rejected'
                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                  }`}
                                >
                                  {loan.grantor1Status || 'Pending'}
                                </span>
                              </div>
                            )}
                            {loan.grantor2 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Grantor 2:
                                </span>
                                <span className="text-xs font-bold capitalize">
                                  {loan.grantor2.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                                    loan.grantor2Status === 'approved'
                                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                      : loan.grantor2Status === 'rejected'
                                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                  }`}
                                >
                                  {loan.grantor2Status || 'Pending'}
                                </span>
                              </div>
                            )}
                            {loan.status === 'active' && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs font-bold mb-1">
                                  <span className="text-muted-foreground">
                                    Remaining
                                  </span>
                                  <span>
                                    {formatCurrency(
                                      loan.remainingAmount || loan.totalAmount,
                                    )}
                                  </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all"
                                    style={{
                                      width: `${100 - ((loan.remainingAmount || loan.totalAmount) / loan.totalAmount) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pt-4 sm:pt-0 mt-2 sm:mt-0 border-t sm:border-transparent border-border/10">
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
                              className="text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:-translate-x-4 sm:group-hover:translate-x-0 transition-all"
                              size={20}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {isMobile ? (
                      currentPage < totalPages && (
                        <div
                          ref={observerTarget}
                          className="space-y-3 animate-pulse"
                        >
                          {[1, 2].map((i) => (
                            <div
                              key={i}
                              className="p-6 rounded-[2rem] border border-border/50 bg-muted/20"
                            >
                              <div className="flex items-center justify-between">
                                <div className="space-y-2 flex-1">
                                  <div className="h-4 w-32 bg-muted/50 rounded" />
                                  <div className="h-3 w-24 bg-muted/40 rounded" />
                                </div>
                                <div className="h-8 w-20 bg-muted/50 rounded-full" />
                              </div>
                            </div>
                          ))}
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
                          const memberToken = localStorage.getItem('member');
                          api
                            .get(`/loans/my-loans?page=${p}&limit=${limit}`, {
                              headers: {
                                /* Auth header handled by browser cookies */
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
