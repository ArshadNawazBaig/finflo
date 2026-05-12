import { useState, useEffect } from 'react';
import {
  ExternalLink,
  Coins,
  Download,
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
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import CalendarSkeleton from '@/components/skeletons/CalendarSkeleton';
import QuickActionsSkeleton from '@/components/skeletons/QuickActionsSkeleton';
import StatsRiskRowSkeleton from '@/components/skeletons/StatsRiskRowSkeleton';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
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

  const handleDownload = async () => {
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
  };

  const overdueCount = stats?.overdue?.count || 0;
  const overdueAmount = stats?.overdue?.amount || 0;
  const collectionRate = stats?.collectionRate ?? 0;
  const riskDist = stats?.riskDistribution || [];
  const totalRiskLoans = riskDist.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* ── Page Header ──────────────────────────────────────── */}
      <PageHeader
        title={
          businessName ? `${businessName} Dashboard` : 'Financial Dashboard'
        }
        description={
          <>
            Welcome back,{' '}
            <strong className="text-foreground capitalize font-black">
              {capitalize(userName)}
            </strong>
            . Here&apos;s your portfolio performance.
          </>
        }
        action={
          canViewReports ? (
            <Button
              onClick={() => {
                setShowCapitalModal(true);
                fetchCapitalHistory();
              }}
              className="rounded-2xl px-5 py-2.5 h-auto bg-teal-500 hover:bg-teal-600 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 shadow-lg shadow-teal-500/20 gap-2 w-full sm:w-auto"
            >
              <Landmark size={16} />
              Add Capital
            </Button>
          ) : null
        }
      />

      {/* ── Branch Scope Banner (branch managers only) ────────── */}
      {isManager && (
        <div className="flex items-center gap-4 rounded-[1.75rem] border border-teal-500/25 bg-teal-500/8 px-5 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/80">
                Branch View
              </p>
              {branchName && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                  {branchName}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground/80 mt-0.5">
              You&apos;re viewing data for your assigned branch only.{' '}
              {branchName && (
                <span className="font-black text-teal-600 dark:text-teal-400">
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
        <div className="bg-gradient-to-r from-rose-500/10 to-orange-500/10 border border-rose-500/25 rounded-[2rem] p-5 sm:p-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/80 mb-0.5">
                  Attention Required
                </p>
                <h3 className="text-lg font-black text-foreground tracking-tight">
                  {overdueCount} Overdue Loan{overdueCount > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                  Total overdue:{' '}
                  <span className="font-black text-rose-500">
                    {formatCurrency(overdueAmount)}
                  </span>
                </p>
              </div>
            </div>
            {canManageLoans && (
              <Button
                onClick={() => navigate('/loans?status=overdue')}
                className="rounded-2xl px-6 py-2.5 h-auto bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 shadow-lg shadow-rose-500/20"
              >
                View Overdue
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
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {visibleActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className={cn(
                  'group relative overflow-hidden flex-1 min-w-[240px] flex items-center gap-4 rounded-full border border-border/40 bg-card/40 backdrop-blur-md p-2 pr-5 transition-all duration-300 hover:border-border/80 hover:-translate-y-0.5 hover:shadow-lg',
                  action.glow,
                )}
              >
                {/* Ambient hover glow inside the button */}
                <div
                  className={cn(
                    'absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500',
                    action.iconBg,
                  )}
                />

                {/* Left Icon Pill */}
                <div
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3',
                    action.iconBg,
                  )}
                >
                  {/* Subtle shine */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  {action.icon}
                </div>

                {/* Center Text */}
                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                  <p
                    className={cn(
                      'text-sm font-black tracking-tight truncate leading-tight',
                      action.accent,
                    )}
                  >
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-[10px] font-semibold text-muted-foreground/60 truncate uppercase tracking-widest mt-0.5 leading-tight">
                      {action.description}
                    </p>
                  )}
                </div>

                {/* Right Arrow */}
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/30 transition-all duration-300 group-hover:bg-current/10',
                    action.accent,
                  )}
                >
                  <ArrowUpRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </button>
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
            {/* Left: 2×2 grid */}
            <div className="xl:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
              {/* Active Loans */}
              {hasAnyPermission([
                'view_reports',
                'manage_loans',
                'create_loan',
                'view_assigned',
              ]) && (
                <div className="group relative rounded-[1.5rem] bg-card border border-border/50 p-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CreditCard size={18} className="text-primary" />
                    </div>
                    {stats?.activeLoans?.percentage !== undefined && (
                      <span
                        className={cn(
                          'text-[10px] font-black px-2.5 py-1 rounded-full',
                          stats.activeLoans.percentage >= 0
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600',
                        )}
                      >
                        {stats.activeLoans.percentage >= 0 ? '+' : ''}
                        {stats.activeLoans.percentage}%
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                      Active Loans
                    </p>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-0.5">
                      {stats?.activeLoans?.count ?? 0}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                      Outstanding:{' '}
                      <SensitiveBalance iconSize={11}>
                        {formatCurrency(stats?.outstanding?.amount || 0)}
                      </SensitiveBalance>
                    </p>
                  </div>
                </div>
              )}

              {/* Total Members */}
              {hasAnyPermission([
                'view_reports',
                'manage_members',
                'create_member',
              ]) && (
                <div className="group relative rounded-[1.5rem] bg-card border border-border/50 p-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users size={18} className="text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                      Total Members
                    </p>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-0.5">
                      {stats?.members?.total ?? 0}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                      Balance:{' '}
                      <SensitiveBalance iconSize={11}>
                        {formatCurrency(stats?.members?.deposits || 0)}
                      </SensitiveBalance>
                    </p>
                  </div>
                </div>
              )}

              {/* Collection Rate */}
              {canViewReports && (
                <div className="group relative rounded-[1.5rem] bg-card border border-border/50 p-5 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <ShieldCheck size={18} className="text-emerald-500" />
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-black px-2.5 py-1 rounded-full',
                        collectionRate >= 80
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : collectionRate >= 50
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-600',
                      )}
                    >
                      {collectionRate >= 80
                        ? 'Healthy'
                        : collectionRate >= 50
                          ? 'Fair'
                          : 'At Risk'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                      Collection Rate
                    </p>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-0.5">
                      {collectionRate}%
                    </p>
                    <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
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
                    'group relative rounded-[1.5rem] bg-card border p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-300',
                    overdueCount > 0
                      ? 'border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/10'
                      : 'border-border/50 hover:shadow-xl',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        overdueCount > 0 ? 'bg-rose-500/10' : 'bg-muted',
                      )}
                    >
                      <AlertTriangle
                        size={18}
                        className={
                          overdueCount > 0
                            ? 'text-rose-500'
                            : 'text-muted-foreground'
                        }
                      />
                    </div>
                    {overdueCount > 0 && (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600">
                        Action Needed
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                      Overdue Loans
                    </p>
                    <p
                      className={cn(
                        'text-3xl font-black tabular-nums tracking-tight mt-0.5',
                        overdueCount > 0 ? 'text-rose-500' : 'text-foreground',
                      )}
                    >
                      {overdueCount}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                      {overdueCount > 0
                        ? formatCurrency(overdueAmount) + ' at risk'
                        : 'All loans on track'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Portfolio Risk Donut */}
            {canViewReports && (
              <div className="xl:col-span-1">
                {riskDist.length > 0 ? (
                  <Card className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm h-full">
                    <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
                      <div className="flex items-center gap-2 mb-0.5">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <CardTitle className="text-lg font-black tracking-tight">
                          Portfolio Risk
                        </CardTitle>
                      </div>
                      <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                        Active loans by risk grade
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-4">
                      <div className="flex items-center justify-between gap-4">
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
                                fontWeight: 800,
                              }}
                              formatter={(v, n) => [v + ' loans', n]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-2">
                          {riskDist.map((r) => (
                            <div
                              key={r.grade}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      RISK_COLORS[r.grade] || '#6b7280',
                                  }}
                                />
                                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                  Grade {r.grade}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black tabular-nums">
                                  {r.count}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-bold">
                                  (
                                  {totalRiskLoans > 0
                                    ? Math.round(
                                        (r.count / totalRiskLoans) * 100,
                                      )
                                    : 0}
                                  %)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-border bg-card text-muted-foreground/50 gap-2">
                    <ShieldCheck size={32} className="opacity-30" />
                    <p className="text-xs font-black uppercase tracking-widest">
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
            <div className="h-[400px] flex items-center justify-center bg-card/50 rounded-[2rem] border border-border/50 text-muted-foreground p-8 text-center">
              <div>
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-black tracking-tight">
                  Reports Restricted
                </h3>
                <p className="text-sm font-medium mt-1">
                  Contact your admin to enable report access.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Recent Activity */}
        {canViewDashboard && (
          <div className="xl:col-span-1">
            <Card className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col h-full">
              <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight">
                      Recent Activity
                    </CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mt-1">
                      Real-time settlements
                    </CardDescription>
                  </div>
                  {!loading && canViewReports && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 h-auto rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => navigate('/transactions')}
                      isLoading={loading}
                    >
                      View All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {loading ? (
                  <div className="p-4 sm:p-6 space-y-5 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-muted/40 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-1/2 rounded-lg bg-muted/30" />
                          <Skeleton className="h-2 w-1/3 rounded-lg bg-muted/20" />
                        </div>
                        <Skeleton className="h-4 w-16 rounded-lg bg-muted/30" />
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
        <DialogContent className="sm:max-w-[520px] w-[95vw] rounded-[1.5rem] sm:rounded-[2.5rem] !p-0 border-none shadow-2xl overflow-hidden flex flex-col gap-0 bg-card">
          {/* Gradient Header */}
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 sm:p-10 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-10">
              <Landmark size={64} className="sm:w-20 sm:h-20" />
            </div>
            <DialogHeader className="relative z-10 text-left items-start">
              <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter leading-none mb-2">
                Business Capital
              </DialogTitle>
              <DialogDescription className="text-white/70 font-bold tracking-wide text-[10px] sm:text-xs">
                Manage Owner&apos;s Equity & Funds
              </DialogDescription>
            </DialogHeader>
            {/* Balance Badge */}
            <div className="mt-4 flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">
                  Current Balance
                </p>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight">
                  <SensitiveBalance iconSize={14}>
                    {formatCurrency(stats?.businessCapital || 0)}
                  </SensitiveBalance>
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
              {/* Payment Method */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCapitalPaymentMethod('cash')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-300 text-[10px] font-black uppercase tracking-widest',
                      capitalPaymentMethod === 'cash'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-primary/30',
                    )}
                  >
                    <Wallet size={14} /> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalPaymentMethod('online')}
                    className={cn(
                      'flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-300 text-[10px] font-black uppercase tracking-widest',
                      capitalPaymentMethod === 'online'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-border/40 text-muted-foreground hover:border-blue-500/30',
                    )}
                  >
                    <CreditCard size={14} /> Online
                  </button>
                </div>
              </div>

              {/* Type Toggle */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCapitalType('inject')}
                    className={cn(
                      'relative overflow-hidden flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 transition-all duration-300 font-black text-xs uppercase tracking-widest',
                      capitalType === 'inject'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                        : 'border-border/40 text-muted-foreground hover:border-emerald-500/30 hover:bg-emerald-500/5',
                    )}
                  >
                    <ArrowDownCircle size={18} />
                    Inject
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapitalType('withdraw')}
                    className={cn(
                      'relative overflow-hidden flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 transition-all duration-300 font-black text-xs uppercase tracking-widest',
                      capitalType === 'withdraw'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-600 shadow-lg shadow-orange-500/10 scale-[1.02]'
                        : 'border-border/40 text-muted-foreground hover:border-orange-500/30 hover:bg-orange-500/5',
                    )}
                  >
                    <ArrowUpCircle size={18} />
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Banknote
                      className={cn(
                        'h-5 w-5 transition-colors',
                        capitalType === 'inject'
                          ? 'text-emerald-500'
                          : 'text-orange-500',
                      )}
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="0.00"
                    value={capitalAmount}
                    onChange={(e) => setCapitalAmount(e.target.value)}
                    className="w-full h-14 sm:h-16 pl-14 pr-5 rounded-2xl border border-border/40 bg-muted/30 font-black text-lg sm:text-xl tabular-nums tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    capitalType === 'inject'
                      ? 'E.g. Owner equity injection, seed capital...'
                      : 'E.g. Owner draw, business withdrawal...'
                  }
                  value={capitalDescription}
                  onChange={(e) => setCapitalDescription(e.target.value)}
                  className="w-full h-12 sm:h-14 px-5 rounded-2xl border border-border/40 bg-muted/30 font-bold text-sm tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Recent Capital History */}
              {capitalHistory.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                    Recent Capital Movements
                  </label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                    {capitalHistory.map((txn) => (
                      <div
                        key={txn._id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-8 w-8 rounded-lg flex items-center justify-center',
                              txn.type === 'income'
                                ? 'bg-emerald-500/10'
                                : 'bg-orange-500/10',
                            )}
                          >
                            {txn.type === 'income' ? (
                              <ArrowDownCircle
                                size={14}
                                className="text-emerald-500"
                              />
                            ) : (
                              <ArrowUpCircle
                                size={14}
                                className="text-orange-500"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold truncate max-w-[150px]">
                              {txn.description ||
                                (txn.type === 'income'
                                  ? 'Capital Injection'
                                  : 'Capital Withdrawal')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[9px] text-muted-foreground font-medium">
                                {new Date(txn.date).toLocaleDateString()}
                              </p>
                              {txn.branchId?.name && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <div className="flex items-center gap-1 text-[9px] font-bold text-primary/80 uppercase tracking-wider">
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
                            'text-sm font-black tabular-nums',
                            txn.type === 'income'
                              ? 'text-emerald-600'
                              : 'text-orange-600',
                          )}
                        >
                          {txn.type === 'income' ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="px-6 sm:px-10 pb-6 sm:pb-8 shrink-0 mt-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCapitalModal(false);
                  setCapitalAmount('');
                  setCapitalDescription('');
                  setCapitalPaymentMethod('online');
                }}
                className="flex-1 rounded-xl min-h-12 font-black uppercase text-[10px] tracking-widest border-border/40 hover:bg-muted/50 order-2 sm:order-1 transition-all"
              >
                Cancel
              </Button>
              <Button
                disabled={!capitalAmount || parseFloat(capitalAmount) <= 0}
                onClick={handleCapitalSubmit}
                className={cn(
                  'flex-[1.5] rounded-xl min-h-12 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg transform transition-all active:scale-95 order-1 sm:order-2 gap-2 text-white',
                  capitalType === 'inject'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20',
                )}
              >
                {capitalProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : capitalType === 'inject' ? (
                  <ArrowDownCircle size={14} />
                ) : (
                  <ArrowUpCircle size={14} />
                )}
                {capitalProcessing
                  ? 'Processing...'
                  : capitalType === 'inject'
                    ? 'Inject Capital'
                    : 'Withdraw Capital'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
