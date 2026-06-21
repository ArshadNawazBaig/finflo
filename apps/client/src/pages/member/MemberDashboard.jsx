import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { memberAtom } from '@/atoms';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Target,
  ArrowRight,
  ArrowUpRight,
  Download,
  Send,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import ActionPill from '@/components/ui/ActionPill';
import { MemberDashboardSkeleton } from '@/components/ui/PageSkeletons';
import MemberLoanRequestModal from '@/components/member/MemberLoanRequestModal';
import MemberFinancialSnapshot from '@/components/member/MemberFinancialSnapshot';
import FinancialCalendar from '@/components/member/FinancialCalendar';
import TermDepositsWidget from '@/components/member/TermDepositsWidget';
import DividendsWidget from '@/components/member/DividendsWidget';
import SavingGoalsList from '@/components/savings/SavingGoalsList';
import CreateSavingGoalModal from '@/components/savings/CreateSavingGoalModal';
import ContributeGoalModal from '@/components/savings/ContributeGoalModal';

import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize, cn } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import UITooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  MEMBER_INFLOW_TYPES as CASH_INFLOW_TYPES,
  MEMBER_OUTFLOW_TYPES as CASH_OUTFLOW_TYPES,
} from '@/lib/transactionDirection';

// Wallet cash-flow classification, keyed off the activity feed's `type`
// (Investment types + the synthesized profit/repayment/goal rows). Money in vs
// money out of the member's wallet — shared with every other ledger view via
// lib/transactionDirection so the buckets can't drift from the row signs.

// Tooltip for the bucketed/cumulative cash-flow chart.
const CashFlowTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  const rows =
    mode === 'cumulative'
      ? [
          {
            k: 'balance',
            l: 'Net Position',
            v: row.balance,
            c: 'hsl(var(--primary))',
          },
        ]
      : [
          { k: 'in', l: 'Inflow', v: row.inflow, c: '#10b981' },
          { k: 'out', l: 'Outflow', v: row.outflow, c: '#f43f5e' },
          { k: 'net', l: 'Net', v: row.net, c: 'hsl(var(--primary))' },
        ];
  return (
    <div className="bg-background/95 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5 min-w-[180px]">
      <p className="text-[10px] font-black text-muted-foreground mb-3 uppercase tracking-[0.2em] border-b border-border/50 pb-2">
        {label}
      </p>
      <div className="space-y-2.5">
        {rows.map((e) => (
          <div key={e.k} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: e.c }}
              />
              <span className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-wider">
                {e.l}:
              </span>
            </div>
            <span
              className="text-xs font-black tabular-nums"
              style={{ color: e.c }}
            >
              {formatCurrency(e.v || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const [cashFlowView, setCashFlowView] = useState('bucketed'); // 'bucketed' | 'cumulative'
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

        // Categorize every wallet movement by its type. Money IN includes
        // deposits, received transfers, profit credits, AND loan disbursements
        // (borrowed cash still lands in the wallet) — previously these last two
        // were dropped, which left the chart flat at zero for members whose only
        // activity was a loan payout. Money OUT covers withdrawals, sent
        // transfers, repayments, and goal allocations (all typed 'withdrawal'/
        // 'transfer_send' by the activity feed).
        if (CASH_INFLOW_TYPES.has(item.type)) {
          last6Months[monthIndex].inflow += amount;
        } else if (CASH_OUTFLOW_TYPES.has(item.type)) {
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
    ? capitalize(member?.businessName || member?.user?.businessName) || 'FinFlo'
    : 'FinFlo';

  if (loading && loans.length === 0) {
    return <MemberDashboardSkeleton />;
  }

  // Bucketed view: inflow positive, outflow mirrored below zero, with a net
  // line through. Cumulative view: running net cash position month over month.
  const cashFlowRaw = getChartData();
  const cashFlowData = cashFlowRaw.map((d) => ({
    ...d,
    outflowNeg: -(d.outflow || 0),
    net: (d.inflow || 0) - (d.outflow || 0),
  }));
  let cashFlowRunning = 0;
  const cashFlowCumulative = cashFlowRaw.map((d) => {
    cashFlowRunning += (d.inflow || 0) - (d.outflow || 0);
    return { month: d.month, balance: cashFlowRunning };
  });
  const cashFlowEndsNegative =
    cashFlowCumulative.length > 0 &&
    cashFlowCumulative[cashFlowCumulative.length - 1].balance < 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            {businessName} Portal
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.035em] leading-[1.05] text-slate-900 dark:text-white capitalize">
            Welcome back,{' '}
            <span className="text-primary">{capitalize(member?.name)}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Manage your finances and financial targets — track balances,
            repayments, and goals at a glance.
          </p>
        </div>
        <Button
          onClick={() => setIsRequestModalOpen(true)}
          className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto hover:text-white"
        >
          <Plus size={14} strokeWidth={2.5} />
          New request
          <span className="ml-0.5 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
            <ArrowUpRight size={12} strokeWidth={3} />
          </span>
        </Button>
      </div>

      {/* Financial snapshot hero — balance, active loan & credit score */}
      <MemberFinancialSnapshot
        member={member}
        activeLoansCount={activeLoansCount}
        onRequestLoan={() => setIsRequestModalOpen(true)}
        onRepay={() =>
          navigate(`/member/loans/${member?.activeLoan?._id || ''}`)
        }
      />

      {/* Financial Calendar — full width */}
      <FinancialCalendar className="my-8" />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <ActionPill
          icon={<Plus size={18} strokeWidth={2.5} />}
          label="New Request"
          description="Apply for a new loan"
          iconBg="bg-primary"
          accent="text-primary"
          onClick={() => setIsRequestModalOpen(true)}
        />
        <ActionPill
          icon={<Send size={18} strokeWidth={2.5} />}
          label="Transfer Funds"
          description="Send or withdraw money"
          iconBg="bg-blue-500"
          accent="text-blue-500"
          onClick={() => navigate('/member/transfer')}
        />
        <ActionPill
          icon={<Target size={18} strokeWidth={2.5} />}
          label="New Goal"
          description="Set a saving target"
          iconBg="bg-emerald-500"
          accent="text-emerald-500"
          onClick={() => setIsGoalModalOpen(true)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Cash flow
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  {cashFlowView === 'bucketed'
                    ? 'Inflow vs outflow'
                    : 'Cash position'}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {cashFlowView === 'bucketed'
                    ? 'Green is money in · Red is money out · Line is net'
                    : 'Running net cash position · Last 6 months'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setCashFlowView('bucketed')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all',
                      cashFlowView === 'bucketed'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                        : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    Bucketed
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setCashFlowView('cumulative')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.12em] transition-all',
                      cashFlowView === 'cumulative'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                        : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    Cumulative
                  </Button>
                </div>
                <Link
                  to="/member/transactions"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 hover:text-primary hover:bg-primary/10 transition-all group"
                >
                  <ArrowUpRight
                    size={14}
                    strokeWidth={2.5}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </div>
            </div>
            <div className="h-[300px] w-full outline-none focus:outline-none">
              <ResponsiveContainer
                width="100%"
                height="100%"
                className="outline-none focus:outline-none"
              >
                {cashFlowView === 'bucketed' ? (
                  <ComposedChart
                    data={cashFlowData}
                    margin={{ top: 16, right: 12, left: 8, bottom: 0 }}
                    style={{ outline: 'none' }}
                  >
                    <defs>
                      <linearGradient
                        id="md-inflow"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#10b981"
                          stopOpacity={0.95}
                        />
                        <stop
                          offset="100%"
                          stopColor="#10b981"
                          stopOpacity={0.35}
                        />
                      </linearGradient>
                      <linearGradient
                        id="md-outflow"
                        x1="0"
                        y1="1"
                        x2="0"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f43f5e"
                          stopOpacity={0.95}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f43f5e"
                          stopOpacity={0.35}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted-foreground)/0.1)"
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
                      tickFormatter={(v) => formatChartValue(Math.abs(v))}
                      width={44}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="hsl(var(--muted-foreground)/0.4)"
                    />
                    <Tooltip
                      content={<CashFlowTooltip mode="bucketed" />}
                      cursor={{ fill: 'hsl(var(--primary)/0.06)' }}
                    />
                    <Bar
                      dataKey="inflow"
                      fill="url(#md-inflow)"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="outflowNeg"
                      fill="url(#md-outflow)"
                      radius={[0, 0, 10, 10]}
                      maxBarSize={36}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: 'hsl(var(--background))',
                        fill: 'hsl(var(--primary))',
                      }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 3,
                        stroke: 'hsl(var(--background))',
                        fill: 'hsl(var(--primary))',
                      }}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart
                    data={cashFlowCumulative}
                    margin={{ top: 16, right: 12, left: 8, bottom: 0 }}
                    style={{ outline: 'none' }}
                  >
                    <defs>
                      <linearGradient id="md-pos" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient id="md-neg" x1="0" y1="1" x2="0" y2="0">
                        <stop
                          offset="0%"
                          stopColor="#f43f5e"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f43f5e"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted-foreground)/0.1)"
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
                      width={44}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="hsl(var(--muted-foreground)/0.5)"
                      strokeDasharray="4 4"
                    />
                    <Tooltip content={<CashFlowTooltip mode="cumulative" />} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fill={
                        cashFlowEndsNegative ? 'url(#md-neg)' : 'url(#md-pos)'
                      }
                      activeDot={{
                        r: 6,
                        strokeWidth: 3,
                        stroke: 'hsl(var(--background))',
                        fill: 'hsl(var(--primary))',
                      }}
                    />
                  </AreaChart>
                )}
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
            <div className="p-6 sm:p-8 rounded-[2rem] border border-primary/20 space-y-6 bg-primary/[0.06] transition-all duration-300">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1">
                  Grantor approval
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Loans pending your approval
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
                      className="p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50/40 dark:hover:bg-white/[0.04] transition-colors duration-300 group"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                            <h4 className="font-extrabold tracking-[-0.02em] text-base capitalize text-slate-900 dark:text-white">
                              {capitalize(loan.customer?.name)} -{' '}
                              <span className="tabular-nums">
                                {formatCurrency(loan.principal)}
                              </span>
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] bg-amber-500/10 text-amber-600">
                              Your approval required
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            Duration: {loan.duration} months · Amount:{' '}
                            <span className="font-extrabold tabular-nums text-slate-700 dark:text-slate-300">
                              {formatCurrency(loan.principal)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-4 sm:pt-0 border-t sm:border-transparent border-slate-100 dark:border-white/[0.06] mt-2 sm:mt-0 w-full sm:w-auto">
                          <Button
                            onClick={() =>
                              handleGrantorStatus(loan._id, 'approved')
                            }
                            variant="outline"
                            className="flex-1 sm:flex-none rounded-full text-[10px] font-extrabold uppercase tracking-[0.12em] border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() =>
                              handleGrantorStatus(loan._id, 'rejected')
                            }
                            variant="outline"
                            className="flex-1 sm:flex-none rounded-full text-[10px] font-extrabold uppercase tracking-[0.12em] border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white"
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
            <div className="p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-6 bg-slate-50/40 dark:bg-white/[0.02]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Grantor
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  My grantor history
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
                        className="p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] transition-all"
                      >
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start sm:items-center justify-between sm:justify-start gap-2.5 mb-2 flex-wrap">
                              <h4 className="font-extrabold tracking-[-0.02em] text-base capitalize leading-tight text-slate-900 dark:text-white">
                                {capitalize(loan.customer?.name)} -{' '}
                                <span className="tabular-nums">
                                  {formatCurrency(loan.principal)}
                                </span>
                              </h4>
                              <span
                                className={cn(
                                  'shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]',
                                  myStatus === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-rose-500/10 text-rose-600',
                                )}
                              >
                                {myStatus}
                              </span>
                            </div>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                              Duration: {loan.duration} months · Loan status:{' '}
                              {capitalize(loan.status)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Loans
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  My loan requests
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  View and manage all your loan applications
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  to="/member/loans"
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
                >
                  View all
                  <ArrowUpRight size={12} strokeWidth={2.5} />
                </Link>
                <Button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="group inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 h-auto rounded-full font-bold text-[12px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Plus size={13} strokeWidth={2.5} /> Request loan
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
                    className="p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors duration-300 group cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start sm:items-center justify-between sm:justify-start gap-2.5 mb-2 flex-wrap">
                          <h4 className="font-extrabold tracking-[-0.02em] text-base leading-tight text-slate-900 dark:text-white">
                            <span className="tabular-nums">
                              {formatCurrency(loan.principal)}
                            </span>{' '}
                            Loan
                          </h4>
                          <span
                            className={cn(
                              'shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]',
                              loan.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : loan.status === 'pending'
                                  ? loan.grantor1Status === 'pending' ||
                                    loan.grantor2Status === 'pending'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                  : loan.status === 'completed'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400',
                            )}
                          >
                            {loan.status === 'pending' &&
                            (loan.grantor1Status === 'pending' ||
                              loan.grantor2Status === 'pending')
                              ? 'Pending Grantor'
                              : loan.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          {loan.duration} months @{' '}
                          <span className="font-extrabold tabular-nums text-slate-700 dark:text-slate-300">
                            {loan.rate}%
                          </span>{' '}
                          interest
                        </p>
                        {loan.grantor1 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]">
                              Grantor 1
                            </span>
                            <span className="text-[12px] font-extrabold capitalize text-slate-700 dark:text-slate-200">
                              {capitalize(loan.grantor1.name)}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.1em]',
                                loan.grantor1Status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : loan.grantor1Status === 'rejected'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-amber-500/10 text-amber-600',
                              )}
                            >
                              {loan.grantor1Status || 'Pending'}
                            </span>
                          </div>
                        )}
                        {loan.grantor2 && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]">
                              Grantor 2
                            </span>
                            <span className="text-[12px] font-extrabold capitalize text-slate-700 dark:text-slate-200">
                              {capitalize(loan.grantor2.name)}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.1em]',
                                loan.grantor2Status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : loan.grantor2Status === 'rejected'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-amber-500/10 text-amber-600',
                              )}
                            >
                              {loan.grantor2Status || 'Pending'}
                            </span>
                          </div>
                        )}
                        {loan.status === 'active' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                              <span className="text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] text-[10px]">
                                Remaining
                              </span>
                              <span className="tabular-nums font-extrabold text-slate-900 dark:text-white">
                                {formatCurrency(
                                  loan.remainingAmount || loan.totalAmount,
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{
                                  width: `${100 - ((loan.remainingAmount || loan.totalAmount) / loan.totalAmount) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pt-4 sm:pt-0 mt-2 sm:mt-0 border-t sm:border-transparent border-slate-100 dark:border-white/[0.06]">
                        <UITooltip content="Download Statement">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportLoanStatement(
                                loan,
                                loan.repayments || [],
                                member,
                              );
                            }}
                            className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-95 [&_svg]:w-3.5 [&_svg]:h-3.5"
                          >
                            <Download size={14} />
                          </Button>
                        </UITooltip>
                        <ArrowRight
                          className="text-slate-400 dark:text-slate-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:-translate-x-4 sm:group-hover:translate-x-0 transition-all"
                          size={18}
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
                          className="p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="h-4 w-32 bg-slate-100 dark:bg-white/[0.06] rounded-lg" />
                              <div className="h-3 w-24 bg-slate-100/70 dark:bg-white/[0.04] rounded-lg" />
                            </div>
                            <div className="h-7 w-20 bg-slate-100 dark:bg-white/[0.06] rounded-full" />
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
          <div className="sticky top-10 space-y-6">
            <TermDepositsWidget />
            <DividendsWidget />
            <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] h-full">
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
