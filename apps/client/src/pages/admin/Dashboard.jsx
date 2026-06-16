import { useState, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Coins,
  TrendingUp,
  Users,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  BarChart3,
  FileText,
  Landmark,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Banknote,
  Wallet,
  Building2,
} from 'lucide-react';
import { subMonths } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import { SensitiveBalance } from '@/components/ui/SensitiveData';
import AnalyticsChart from '@/components/AnalyticsChart';
import { AdminDashboardSkeleton } from '@/components/ui/PageSkeletons';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import CalendarSkeleton from '@/components/skeletons/CalendarSkeleton';
import QuickActionsSkeleton from '@/components/skeletons/QuickActionsSkeleton';
import StatsRiskRowSkeleton from '@/components/skeletons/StatsRiskRowSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import api from '@/lib/axios';
import { formatCurrency, capitalize, cn } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import { useNavigate } from 'react-router-dom';
import RepaymentCalendar from '@/components/loans/RepaymentCalendar';
import { toast } from 'sonner';
import { exportCashFlowStatement } from '@/lib/cashFlowPdfUtils';
import usePermissions from '@/hooks/usePermissions';
import ActivityFeed from '@/components/ActivityFeed';
import InsightsWidget from '@/components/dashboard/InsightsWidget';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const RISK_COLORS = {
  'A+': '#10b981',
  A: '#34d399',
  B: '#3b82f6',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
  'N/A': '#6b7280',
};

const QUICK_ACTIONS = [
  {
    label: 'New Loan',
    description: 'Disburse a new loan',
    icon: <CreditCard size={22} />,
    route: '/loans',
    permission: 'manage_loans',
    altPermission: 'create_loan',
    iconBg: 'bg-primary',
    glow: 'hover:shadow-primary/20',
    accent: 'text-primary',
  },
  {
    label: 'Loan Requests',
    description: 'View loan requests',
    icon: <FileText size={22} />,
    route: '/loan-requests',
    permission: 'manage_members',
    altPermission: 'create_member',
    iconBg: 'bg-blue-500',
    glow: 'hover:shadow-blue-500/20',
    accent: 'text-blue-500',
  },
  {
    label: 'Record Payment',
    description: 'Log a loan repayment',
    icon: <DollarSign size={22} />,
    route: '/transactions',
    permission: 'manage_loans',
    altPermission: 'create_loan',
    iconBg: 'bg-emerald-500',
    glow: 'hover:shadow-emerald-500/20',
    accent: 'text-emerald-500',
  },
  {
    label: 'View Reports',
    description: 'Analytics & statements',
    icon: <BarChart3 size={22} />,
    route: '/reports',
    permission: 'view_reports',
    altPermission: null,
    iconBg: 'bg-amber-500',
    glow: 'hover:shadow-amber-500/20',
    accent: 'text-amber-500',
  },
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [userName, setUserName] = useState('admin');
  const [isManager, setIsManager] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission } = usePermissions();

  // ── Capital Modal State ────────────────────────────
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [capitalType, setCapitalType] = useState('inject');
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalDescription, setCapitalDescription] = useState('');
  const [capitalPaymentMethod, setCapitalPaymentMethod] = useState('online');
  const [capitalProcessing, setCapitalProcessing] = useState(false);
  const [capitalHistory, setCapitalHistory] = useState([]);
  const [capitalHistoryLoading, setCapitalHistoryLoading] = useState(false);

  const canViewReports = hasPermission('view_reports');
  const canManageLoans = hasAnyPermission(['manage_loans', 'create_loan']);
  const canViewDashboard = hasAnyPermission([
    'view_reports',
    'manage_loans',
    'manage_members',
    'view_assigned',
    '*',
  ]);
  const visibleActions = QUICK_ACTIONS.filter(
    (a) =>
      hasPermission(a.permission) ||
      (a.altPermission && hasPermission(a.altPermission)),
  );

  // ── Capital Handlers ──────────────────────────────
  const fetchCapitalHistory = async () => {
    setCapitalHistoryLoading(true);
    try {
      const { data } = await api.get('/dashboard/capital-history', {
        params: { limit: 5 },
      });
      setCapitalHistory(data.data || []);
    } catch {
      // ignore
    } finally {
      setCapitalHistoryLoading(false);
    }
  };

  const handleCapitalSubmit = async () => {
    const amt = parseFloat(capitalAmount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setCapitalProcessing(true);
    try {
      const { data } = await api.post('/dashboard/capital', {
        amount: amt,
        type: capitalType,
        description: capitalDescription || undefined,
        paymentMethod: capitalPaymentMethod,
      });
      toast.success(data.message);
      setCapitalAmount('');
      setCapitalDescription('');
      setCapitalPaymentMethod('online');
      setShowCapitalModal(false);
      // Refresh stats
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Capital transaction failed');
    } finally {
      setCapitalProcessing(false);
    }
  };

  const fetchDashboardData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setChartLoading(true);

      const params = {};
      if (dateRange?.from && dateRange?.to) {
        params.startDate = dateRange.from.toISOString();
        params.endDate = dateRange.to.toISOString();
      }

      const [statsRes, upcomingRes] = await Promise.all([
        api.get('/dashboard/stats', { params }),
        api.get('/loans/upcoming'),
      ]);

      setStats(statsRes.data.stats);
      setAnalyticsData(statsRes.data.analyticsData || []);
      setUpcomingPayments(upcomingRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Failed to update dashboard data');
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
    if (user?.name) setUserName(user.name);
    if (user?.businessName) setBusinessName(user.businessName);
    if (user?.business?.businessName && !user?.businessName)
      setBusinessName(user.business.businessName);

    // Detect branch manager and resolve branch name
    const managerFlag = user?.isManager === true;
    setIsManager(managerFlag);
    if (managerFlag) {
      api
        .get('/auth/me')
        .then((res) => {
          const branchObj = res.data?.branch;
          if (branchObj?.name) setBranchName(capitalize(branchObj.name));
          else if (typeof branchObj === 'string') setBranchName(branchObj);
        })
        .catch(() => {});
    }

    fetchDashboardData(true);
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) fetchDashboardData();
  }, [dateRange]);

  // Memoized so the React.memo on <AnalyticsChart> isn't defeated by a fresh
  // function identity on every Dashboard re-render.
  const handleDownload = useCallback(async () => {
    try {
      setIsDownloading(true);
      if (!dateRange?.from || !dateRange?.to) {
        toast.error('Please select a date range first');
        return;
      }
      const response = await api.get('/dashboard/download-statement', {
        params: {
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          format: 'json',
        },
      });
      await exportCashFlowStatement(response.data, dateRange, userName);
      toast.success('Statement generated and downloaded as PDF');
    } catch (error) {
      console.error('Failed to download statement', error);
      toast.error('Failed to download statement');
    } finally {
      setIsDownloading(false);
    }
  }, [dateRange, userName]);

  const overdueCount = stats?.overdue?.count || 0;
  const overdueAmount = stats?.overdue?.amount || 0;
  const collectionRate = stats?.collectionRate ?? 0;
  const riskDist = stats?.riskDistribution || [];
  const totalRiskLoans = riskDist.reduce((s, r) => s + r.count, 0);

  if (loading && stats === null) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            {businessName
              ? `${capitalize(businessName)} workspace`
              : 'Workspace'}
          </p>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.035em] leading-[1.05] text-slate-900 dark:text-white capitalize">
            Welcome back,{' '}
            <span className="text-primary">{capitalize(userName)}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Here&apos;s your portfolio performance at a glance — track
            liquidity, collections, and risk across every loan.
          </p>
        </div>
        {canViewReports && (
          <Button
            onClick={() => {
              setShowCapitalModal(true);
              fetchCapitalHistory();
            }}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
          >
            <Landmark size={14} strokeWidth={2.5} />
            Add capital
            <span className="ml-0.5 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
              <ArrowUpRight size={12} strokeWidth={3} />
            </span>
          </Button>
        )}
      </div>

      {/* ── Branch Scope Banner (branch managers only) ────────── */}
      {isManager && (
        <div className="flex items-center gap-4 rounded-[1.75rem] border border-teal-500/20 bg-teal-500/[0.06] px-5 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-600 dark:text-teal-400">
                Branch view
              </p>
              {branchName && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 uppercase tracking-[0.12em]">
                  {branchName}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              You&apos;re viewing data for your assigned branch only.{' '}
              {branchName && (
                <span className="font-extrabold text-teal-600 dark:text-teal-400">
                  {branchName}
                </span>
              )}{' '}
              metrics are displayed across all sections below.
            </p>
          </div>
        </div>
      )}

      {/* ── Overdue Alert ─────────────────────────────────────── */}
      {!loading && overdueCount > 0 && canViewReports && (
        <div className="bg-gradient-to-r from-rose-500/[0.07] to-orange-500/[0.07] border border-rose-500/20 rounded-[2rem] p-5 sm:p-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rose-500 mb-1">
                  Attention required
                </p>
                <h3 className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  {overdueCount} Overdue Loan{overdueCount > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Total overdue:{' '}
                  <span className="font-extrabold text-rose-500 tabular-nums">
                    {formatCurrency(overdueAmount)}
                  </span>
                </p>
              </div>
            </div>
            {canManageLoans && (
              <Button
                onClick={() => navigate('/loans?status=overdue')}
                className="group inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 h-auto rounded-full font-bold text-[12px] shadow-[0_10px_30px_-10px_rgba(244,63,94,0.5)] hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
              >
                View overdue
                <ArrowUpRight size={14} strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Actions (Sleek Horizontal Strips) ───────────── */}
      {visibleActions.length > 0 &&
        (loading ? (
          <QuickActionsSkeleton count={visibleActions.length || 4} />
        ) : (
          <div className="flex flex-wrap gap-3">
            {visibleActions.map((action) => (
              <Button
                variant="ghost"
                key={action.label}
                onClick={() => navigate(action.route)}
                className="group relative overflow-hidden flex-1 min-w-[240px] flex items-center gap-3.5 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-2 pr-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.15)]"
              >
                {/* Left Icon Pill */}
                <div
                  className={cn(
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-105',
                    action.iconBg,
                  )}
                >
                  {action.icon}
                </div>

                {/* Center Text */}
                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                  <p className="text-[13px] font-extrabold tracking-tight truncate leading-tight text-slate-900 dark:text-white">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-tight">
                      {action.description}
                    </p>
                  )}
                </div>

                {/* Right Arrow */}
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-white/[0.04] transition-all duration-300 group-hover:bg-primary/10',
                    action.accent,
                  )}
                >
                  <ArrowUpRight
                    size={13}
                    strokeWidth={2.5}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </Button>
            ))}
          </div>
        ))}

      {/* ── Primary Stats Row ─────────────────────────────────── */}
      {loading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {canViewReports && (
            <StatsCard
              title="Net Liquidity"
              amount={formatCurrency(stats?.banking?.liquidity || 0)}
              subtitle="Available Cash"
              icon={<Coins size={20} />}
              color="bg-emerald-500 shadow-emerald-500/20"
              sensitive
            />
          )}
          {hasAnyPermission([
            'view_reports',
            'manage_loans',
            'create_loan',
          ]) && (
            <StatsCard
              title="Total Disbursed"
              amount={formatCurrency(stats?.banking?.disbursed?.amount || 0)}
              percentage={stats?.banking?.disbursed?.percentage}
              subtitle="Portfolio Value"
              icon={<ExternalLink size={20} />}
              color="bg-orange-500 shadow-orange-500/20"
              sensitive
            />
          )}
          {canViewReports && (
            <StatsCard
              title="Business Capital"
              amount={formatCurrency(stats?.businessCapital || 0)}
              subtitle="Owner's Equity"
              icon={<Landmark size={20} />}
              color="bg-teal-500 shadow-teal-500/20"
              sensitive
            />
          )}
          {canViewReports && (
            <StatsCard
              title="Net Profit"
              amount={formatCurrency(stats?.profit?.amount || 0)}
              percentage={stats?.profit?.percentage}
              subtitle="Interest Earnings"
              icon={<TrendingUp size={20} />}
              color="bg-primary shadow-primary/20"
              sensitive
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ROW 1 — 4 Stat Cards (left 2/3, 2×2) + Portfolio Risk (right 1/3)
          ══════════════════════════════════════════════════════════ */}
      {canViewDashboard &&
        (loading ? (
          <StatsRiskRowSkeleton />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Left: 2×2 grid */}
            <div className="xl:col-span-2 grid grid-cols-2 gap-4">
              {/* Active Loans */}
              {hasAnyPermission([
                'view_reports',
                'manage_loans',
                'create_loan',
                'view_assigned',
              ]) && (
                <div className="group relative p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Active loans
                    </p>
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard
                        size={13}
                        className="text-primary"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                    {stats?.activeLoans?.count ?? 0}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {stats?.activeLoans?.percentage !== undefined && (
                      <>
                        <ArrowUpRight
                          size={11}
                          strokeWidth={3}
                          className={
                            stats.activeLoans.percentage >= 0
                              ? 'text-emerald-500'
                              : 'text-rose-500 rotate-90'
                          }
                        />
                        <span
                          className={cn(
                            'text-[10px] font-extrabold tabular-nums',
                            stats.activeLoans.percentage >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600',
                          )}
                        >
                          {stats.activeLoans.percentage >= 0 ? '+' : ''}
                          {stats.activeLoans.percentage}%
                        </span>
                      </>
                    )}
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Outstanding{' '}
                      <SensitiveBalance iconSize={10}>
                        {formatCurrency(stats?.outstanding?.amount || 0)}
                      </SensitiveBalance>
                    </span>
                  </div>
                </div>
              )}

              {/* Total Members */}
              {hasAnyPermission([
                'view_reports',
                'manage_members',
                'create_member',
              ]) && (
                <div className="group relative p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Total members
                    </p>
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users
                        size={13}
                        className="text-blue-500"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                    {stats?.members?.total ?? 0}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-2">
                    Deposits{' '}
                    <SensitiveBalance iconSize={10}>
                      {formatCurrency(stats?.members?.deposits || 0)}
                    </SensitiveBalance>
                  </p>
                </div>
              )}

              {/* Collection Rate */}
              {canViewReports && (
                <div className="group relative p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Collection rate
                    </p>
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ShieldCheck
                        size={13}
                        className="text-emerald-500"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      {collectionRate}%
                    </p>
                    <span
                      className={cn(
                        'text-[10px] font-extrabold uppercase tracking-wider',
                        collectionRate >= 80
                          ? 'text-emerald-600'
                          : collectionRate >= 50
                            ? 'text-amber-600'
                            : 'text-rose-600',
                      )}
                    >
                      {collectionRate >= 80
                        ? 'Healthy'
                        : collectionRate >= 50
                          ? 'Fair'
                          : 'At risk'}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-1000',
                        collectionRate >= 80
                          ? 'bg-emerald-500'
                          : collectionRate >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500',
                      )}
                      style={{ width: `${Math.min(100, collectionRate)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Overdue Loans */}
              {hasAnyPermission([
                'view_reports',
                'manage_loans',
                'create_loan',
                'view_assigned',
              ]) && (
                <div
                  className={cn(
                    'group relative p-5 rounded-2xl border transition-colors duration-300',
                    overdueCount > 0
                      ? 'border-rose-500/25 bg-rose-500/[0.04] hover:bg-rose-500/[0.07]'
                      : 'border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04]',
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Overdue loans
                    </p>
                    <div
                      className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center',
                        overdueCount > 0
                          ? 'bg-rose-500/15'
                          : 'bg-slate-200/60 dark:bg-white/[0.06]',
                      )}
                    >
                      <AlertTriangle
                        size={13}
                        strokeWidth={2.5}
                        className={
                          overdueCount > 0
                            ? 'text-rose-500'
                            : 'text-slate-400 dark:text-slate-500'
                        }
                      />
                    </div>
                  </div>
                  <p
                    className={cn(
                      'text-3xl font-extrabold tracking-tight tabular-nums',
                      overdueCount > 0
                        ? 'text-rose-500'
                        : 'text-slate-900 dark:text-white',
                    )}
                  >
                    {overdueCount}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-2">
                    {overdueCount > 0
                      ? formatCurrency(overdueAmount) + ' at risk'
                      : 'All loans on track'}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Portfolio Risk Donut */}
            {canViewReports && (
              <div className="xl:col-span-1">
                {riskDist.length > 0 ? (
                  <div className="h-full rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-6 flex flex-col">
                    <div className="mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                        Portfolio
                      </p>
                      <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                        Risk distribution
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        Active loans by grade
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 flex-1">
                      <ResponsiveContainer width="50%" height={150}>
                        <PieChart>
                          <Pie
                            data={riskDist}
                            dataKey="count"
                            nameKey="grade"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            strokeWidth={2}
                            stroke="hsl(var(--card))"
                          >
                            {riskDist.map((entry) => (
                              <Cell
                                key={entry.grade}
                                fill={RISK_COLORS[entry.grade] || '#6b7280'}
                              />
                            ))}
                          </Pie>
                          <ReTooltip
                            contentStyle={{
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '1rem',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                            formatter={(v, n) => [v + ' loans', n]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2.5">
                        {riskDist.map((r) => (
                          <div
                            key={r.grade}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    RISK_COLORS[r.grade] || '#6b7280',
                                }}
                              />
                              <span className="text-[11px] font-bold tracking-tight text-slate-600 dark:text-slate-300">
                                Grade {r.grade}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                                {r.count}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                                {totalRiskLoans > 0
                                  ? Math.round((r.count / totalRiskLoans) * 100)
                                  : 0}
                                %
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-white/[0.02] text-slate-400 dark:text-slate-500 gap-2">
                    <ShieldCheck size={28} className="opacity-40" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em]">
                      No risk data yet
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

      {/* ══════════════════════════════════════════════════════════
          ROW 2 — Cash Flow Analysis (left 2/3) + Recent Activity (right 1/3)
          ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
        {/* Cash Flow Analysis */}
        <div
          className={cn('xl:col-span-2', !canViewDashboard && 'xl:col-span-3')}
        >
          {canViewReports ? (
            loading ? (
              <ChartSkeleton />
            ) : (
              <AnalyticsChart
                data={analyticsData}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onDownload={handleDownload}
                loading={chartLoading}
                isDownloading={isDownloading}
                className="h-full"
              />
            )
          ) : hasAnyPermission(['manage_loans', 'create_loan']) ? (
            <div className="h-[400px] flex items-center justify-center bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 p-8 text-center">
              <div>
                <TrendingUp size={40} className="mx-auto mb-4 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">
                  Restricted
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Reports restricted
                </h3>
                <p className="text-sm font-medium mt-1 leading-relaxed">
                  Contact your admin to enable report access.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Recent Activity */}
        {canViewDashboard && (
          <div className="xl:col-span-1">
            <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none overflow-hidden flex flex-col h-full">
              <CardHeader className="p-5 sm:p-6 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      Activity
                    </p>
                    <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                      Recent activity
                    </CardTitle>
                    <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Real-time settlements
                    </CardDescription>
                  </div>
                  {!loading && canViewReports && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] font-bold px-3 py-1.5 h-auto rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all gap-1"
                      onClick={() => navigate('/transactions')}
                      isLoading={loading}
                    >
                      View all
                      <ArrowUpRight size={12} strokeWidth={2.5} />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {loading ? (
                  <div className="p-5 sm:p-6 space-y-5 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-1/2 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                          <Skeleton className="h-2 w-1/3 rounded-lg bg-slate-100/70 dark:bg-white/[0.04]" />
                        </div>
                        <Skeleton className="h-4 w-16 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[324px] overflow-y-auto custom-scrollbar">
                    <ActivityFeed />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Repayment Calendar ────────────────────────────────── */}
      {hasAnyPermission([
        'view_reports',
        'manage_loans',
        'create_loan',
        'view_assigned',
      ]) && (
        <div className="w-full">
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <RepaymentCalendar upcomingPayments={upcomingPayments} />
          )}
        </div>
      )}

      {/* ── AI Insights ─────────────────────────────────────────── */}
      {canViewDashboard && !loading && <InsightsWidget />}

      {/* ── Business Capital Modal ──────────────────────────────── */}
      <Dialog
        open={showCapitalModal}
        onOpenChange={(open) => {
          if (!open) {
            setCapitalAmount('');
            setCapitalDescription('');
            setCapitalPaymentMethod('online');
          }
          setShowCapitalModal(open);
        }}
      >
        <DialogContent className="sm:max-w-[520px] !p-0 !gap-0 !grid-cols-none !flex !flex-col !overflow-hidden max-h-[90vh]">
          {/* Header (fixed) */}
          <div className="p-6 sm:p-7 pb-5 flex items-start gap-3 shrink-0 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <Landmark />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1.5">
                Owner&apos;s equity
              </p>
              <DialogTitle>Business Capital</DialogTitle>
              <DialogDescription className="mt-1">
                Inject or withdraw funds from the business capital pool.
              </DialogDescription>
            </div>
          </div>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 sm:px-7 py-5 space-y-5">
            <div className="rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1.5">
                Current balance
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
                <SensitiveBalance iconSize={14}>
                  {formatCurrency(stats?.businessCapital || 0)}
                </SensitiveBalance>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Payment method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setCapitalPaymentMethod('cash')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-full border transition-all text-xs font-semibold',
                    capitalPaymentMethod === 'cash'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  <Wallet size={14} /> Cash
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setCapitalPaymentMethod('online')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-full border transition-all text-xs font-semibold',
                    capitalPaymentMethod === 'online'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  <CreditCard size={14} /> Online
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Transaction type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setCapitalType('inject')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all text-sm font-semibold',
                    capitalType === 'inject'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  <ArrowDownCircle size={16} />
                  Inject
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setCapitalType('withdraw')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all text-sm font-semibold',
                    capitalType === 'withdraw'
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-500 dark:text-rose-400'
                      : 'border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                  )}
                >
                  <ArrowUpCircle size={16} />
                  Withdraw
                </Button>
              </div>
            </div>

            <FormField
              className="space-y-1.5"
              label="Amount"
              htmlFor="capitalAmount"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Banknote
                    className={cn(
                      'h-4 w-4 transition-colors',
                      capitalType === 'inject'
                        ? 'text-emerald-500'
                        : 'text-rose-500',
                    )}
                  />
                </div>
                <Input
                  id="capitalAmount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  className="h-12 pl-11 pr-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-extrabold text-lg tabular-nums tracking-tight focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </FormField>

            <FormField
              className="space-y-1.5"
              label={
                <>
                  Description{' '}
                  <span className="text-slate-300 dark:text-slate-600 font-normal">
                    (optional)
                  </span>
                </>
              }
              htmlFor="capitalDescription"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <Input
                id="capitalDescription"
                type="text"
                placeholder={
                  capitalType === 'inject'
                    ? 'E.g. Owner equity injection, seed capital...'
                    : 'E.g. Owner draw, business withdrawal...'
                }
                value={capitalDescription}
                onChange={(e) => setCapitalDescription(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
              />
            </FormField>

            {capitalHistory.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 block">
                  Recent capital movements
                </label>
                <div className="space-y-2">
                  {capitalHistory.map((txn) => (
                    <div
                      key={txn._id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                            txn.type === 'income'
                              ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
                          )}
                        >
                          {txn.type === 'income' ? (
                            <ArrowDownCircle />
                          ) : (
                            <ArrowUpCircle />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {txn.description ||
                              (txn.type === 'income'
                                ? 'Capital Injection'
                                : 'Capital Withdrawal')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              {new Date(txn.date).toLocaleDateString()}
                            </p>
                            {txn.branchId?.name && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
                                <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                                  <Building2 size={9} />
                                  {txn.branchId.name}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-extrabold tabular-nums shrink-0',
                          isCreditType(txn.type, 'ledger')
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-500 dark:text-rose-400',
                        )}
                      >
                        {isCreditType(txn.type, 'ledger') ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer (fixed) */}
          <div className="px-6 sm:px-7 py-4 sm:py-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06] shrink-0 bg-white dark:bg-slate-950">
            <Button
              variant="ghost"
              onClick={() => {
                setShowCapitalModal(false);
                setCapitalAmount('');
                setCapitalDescription('');
                setCapitalPaymentMethod('online');
              }}
              className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </Button>
            <Button
              disabled={!capitalAmount || parseFloat(capitalAmount) <= 0}
              onClick={handleCapitalSubmit}
              className={cn(
                'h-11 px-7 rounded-full font-bold text-sm text-white transition-all hover:-translate-y-0.5 flex items-center gap-2',
                capitalType === 'inject'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-[0_10px_30px_-10px_rgba(244,63,94,0.5)]',
              )}
            >
              {capitalProcessing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : capitalType === 'inject' ? (
                <ArrowDownCircle size={14} strokeWidth={2.5} />
              ) : (
                <ArrowUpCircle size={14} strokeWidth={2.5} />
              )}
              {capitalProcessing
                ? 'Processing...'
                : capitalType === 'inject'
                  ? 'Inject Capital'
                  : 'Withdraw Capital'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
