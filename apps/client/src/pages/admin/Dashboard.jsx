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
  UserPlus,
  ArrowUpRight,
  BarChart3,
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
import AnalyticsChart from '@/components/AnalyticsChart';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import CalendarSkeleton from '@/components/skeletons/CalendarSkeleton';
import QuickActionsSkeleton from '@/components/skeletons/QuickActionsSkeleton';
import StatsRiskRowSkeleton from '@/components/skeletons/StatsRiskRowSkeleton';
import { Button } from '@/components/ui/button';
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
    icon: <CreditCard size={18} />,
    route: '/loans',
    permission: 'manage_loans',
    altPermission: 'create_loan',
    color:
      'from-primary/20 to-primary/5 border-primary/20 text-primary hover:shadow-primary/10',
  },
  {
    label: 'Add Member',
    icon: <UserPlus size={18} />,
    route: '/members',
    permission: 'manage_members',
    altPermission: 'create_member',
    color:
      'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-500 hover:shadow-blue-500/10',
  },
  {
    label: 'Record Payment',
    icon: <DollarSign size={18} />,
    route: '/transactions',
    permission: 'manage_loans',
    altPermission: 'create_loan',
    color:
      'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-500 hover:shadow-emerald-500/10',
  },
  {
    label: 'View Reports',
    icon: <BarChart3 size={18} />,
    route: '/reports',
    permission: 'view_reports',
    altPermission: null,
    color:
      'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-500 hover:shadow-amber-500/10',
  },
];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userPlan, setUserPlan] = useState('Free');
  const [loanCount, setLoanCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [branchCount, setBranchCount] = useState(0);
  const [planLimits, setPlanLimits] = useState(null);
  const [userName, setUserName] = useState('admin');
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const canViewReports = hasPermission('view_reports');
  const canManageLoans = hasAnyPermission(['manage_loans', 'create_loan']);
  const canManageMembers = hasAnyPermission([
    'manage_members',
    'create_member',
  ]);
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

  const fetchDashboardData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setChartLoading(true);

      const params = {};
      if (dateRange?.from && dateRange?.to) {
        params.startDate = dateRange.from.toISOString();
        params.endDate = dateRange.to.toISOString();
      }

      const [statsRes, upcomingRes, billingRes] = await Promise.all([
        api.get('/dashboard/stats', { params }),
        api.get('/loans/upcoming'),
        api.get('/subscription'),
      ]);

      setStats(statsRes.data.stats);
      setAnalyticsData(statsRes.data.analyticsData || []);
      setUpcomingPayments(upcomingRes.data);

      const billingData = billingRes.data;
      setUserPlan(billingData.plan || 'Free');
      setLoanCount(
        billingData.usage?.loans ||
          statsRes.data.stats?.activeLoans?.count ||
          0,
      );
      setMemberCount(billingData.usage?.members || 0);
      setBranchCount(billingData.usage?.branches || 0);
      setPlanLimits(billingData.limits || null);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
      toast.error('Failed to update dashboard data');
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.name) setUserName(user.name);
    if (user?.role) setUserRole(user.role);
    fetchDashboardData(true);
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) fetchDashboardData();
  }, [dateRange]);

  const handleDownload = async () => {
    try {
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
        title="Financial Intelligence"
        description={
          <>
            Welcome back,{' '}
            <strong className="text-foreground capitalize font-black">
              {capitalize(userName)}
            </strong>
            . Here's your portfolio performance.
          </>
        }
      />

      {/* ── Plan Usage Banner (admin only) ───────────────────── */}
      {!loading &&
        userRole === 'admin' &&
        userPlan !== 'Pro' &&
        (() => {
          const limits = {
            loans: planLimits?.loans ?? (userPlan === 'Basic' ? 50 : 5),
            members: planLimits?.members ?? (userPlan === 'Basic' ? 3 : 1),
            branches: planLimits?.branches ?? (userPlan === 'Basic' ? 3 : 1),
          };
          const lu = Math.min(100, (loanCount / limits.loans) * 100);
          const mu = Math.min(100, (memberCount / limits.members) * 100);
          const bu = Math.min(
            100,
            (branchCount / (limits.branches || 1)) * 100,
          );
          if (lu < 80 && mu < 80 && bu < 80) return null;
          const isAtLimit = lu >= 100 || mu >= 100 || bu >= 100;
          const primaryMetric =
            bu >= 80 ? 'branches' : mu >= 80 ? 'members' : 'loans';
          const current =
            bu >= 80 ? branchCount : mu >= 80 ? memberCount : loanCount;
          const limit =
            bu >= 80
              ? limits.branches
              : mu >= 80
                ? limits.members
                : limits.loans;
          const usagePct = bu >= 80 ? bu : mu >= 80 ? mu : lu;
          return (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex-1">
                <h3 className="text-lg font-black text-foreground mb-1">
                  {isAtLimit ? 'Plan Limit Reached' : 'Approaching Plan Limit'}
                </h3>
                <p className="text-sm text-muted-foreground font-medium mb-3">
                  You're using{' '}
                  <strong className="text-foreground">
                    {current} of {limit}
                  </strong>{' '}
                  {primaryMetric} on your {userPlan} plan.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/billing')}
                    variant="gradient"
                    className="px-6 h-auto py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap"
                  >
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

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

      {/* ── Quick Actions ─────────────────────────────────────── */}
      {visibleActions.length > 0 &&
        (loading ? (
          <QuickActionsSkeleton count={visibleActions.length || 4} />
        ) : (
          <div
            className={cn(
              'grid gap-3 sm:gap-4',
              visibleActions.length === 1 && 'grid-cols-1 sm:grid-cols-2',
              visibleActions.length === 2 && 'grid-cols-2',
              visibleActions.length === 3 && 'grid-cols-2 sm:grid-cols-3',
              visibleActions.length >= 4 && 'grid-cols-2 sm:grid-cols-4',
            )}
          >
            {visibleActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg text-left',
                  action.color,
                )}
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-current/10 transition-transform duration-300 group-hover:scale-110">
                  {action.icon}
                </div>
                <span className="text-sm font-black tracking-tight">
                  {action.label}
                </span>
                <ArrowUpRight
                  size={14}
                  className="ml-auto opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
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
            />
          )}
          {canViewReports && (
            <StatsCard
              title="Total Deposits"
              amount={formatCurrency(stats?.banking?.deposits || 0)}
              subtitle="Member Capital"
              icon={<Download size={20} />}
              color="bg-blue-500 shadow-blue-500/20"
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
                      {formatCurrency(stats?.outstanding?.amount || 0)}
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
                      Balance: {formatCurrency(stats?.members?.deposits || 0)}
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
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-border/40 bg-card/30 text-muted-foreground/50 gap-2">
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
                    >
                      View All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {loading ? (
                  <div className="p-4 sm:p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-muted/40 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div
                            className="h-3 rounded bg-muted/40 animate-pulse"
                            style={{ width: `${60 + i * 7}%` }}
                          />
                          <div className="h-2.5 w-20 rounded bg-muted/30 animate-pulse" />
                        </div>
                        <div className="h-3 w-16 rounded bg-muted/30 animate-pulse" />
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
    </div>
  );
};

export default Dashboard;
