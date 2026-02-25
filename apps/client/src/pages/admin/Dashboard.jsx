import { useState, useEffect } from 'react';
import {
  DollarSign,
  ExternalLink,
  Coins,
  Download,
  TrendingUp,
} from 'lucide-react';
import { subMonths, format } from 'date-fns';
import StatsCard from '@/components/StatsCard';
import AnalyticsChart from '@/components/AnalyticsChart';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import CalendarSkeleton from '@/components/skeletons/CalendarSkeleton';
import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Unused
import api from '@/lib/axios';
import { formatPKR, capitalize, cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import RepaymentCalendar from '@/components/loans/RepaymentCalendar';
import { toast } from 'sonner';
import { exportCashFlowStatement } from '@/lib/cashFlowPdfUtils';
import usePermissions from '@/hooks/usePermissions';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
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
      setTransactions(statsRes.data.recentTransactions);
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
    // Get user name from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.name) {
      setUserName(user.name);
    }
    if (user?.role) {
      setUserRole(user.role);
    }
    fetchDashboardData(true);
  }, []);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchDashboardData();
    }
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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Top Header */}
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

      {/* Plan Usage Banner */}
      {!loading &&
        userRole !== 'super_admin' &&
        userPlan !== 'Pro' &&
        (() => {
          // Use dynamic limits from API with per-field fallback to defaults
          const limits = {
            loans: planLimits?.loans ?? (userPlan === 'Basic' ? 50 : 5),
            members: planLimits?.members ?? (userPlan === 'Basic' ? 3 : 1),
            branches: planLimits?.branches ?? (userPlan === 'Basic' ? 3 : 1),
          };

          const loanUsagePercent = Math.min(
            100,
            (loanCount / limits.loans) * 100,
          );
          const memberUsagePercent = Math.min(
            100,
            (memberCount / limits.members) * 100,
          );
          const branchUsagePercent = Math.min(
            100,
            (branchCount / (limits.branches || 1)) * 100,
          );

          const isNearLoanLimit = loanUsagePercent >= 80;
          const isNearMemberLimit = memberUsagePercent >= 80;
          const isNearBranchLimit = branchUsagePercent >= 80;

          if (isNearLoanLimit || isNearMemberLimit || isNearBranchLimit) {
            const isAtLimit =
              loanUsagePercent >= 100 ||
              memberUsagePercent >= 100 ||
              branchUsagePercent >= 100;
            const primaryMetric = isNearBranchLimit
              ? 'branches'
              : isNearMemberLimit
                ? 'members'
                : 'loans';
            const current = isNearBranchLimit
              ? branchCount
              : isNearMemberLimit
                ? memberCount
                : loanCount;
            const limit = isNearBranchLimit
              ? limits.branches
              : isNearMemberLimit
                ? limits.members
                : limits.loans;
            const usagePercent = isNearBranchLimit
              ? branchUsagePercent
              : isNearMemberLimit
                ? memberUsagePercent
                : loanUsagePercent;

            return (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-foreground mb-1">
                    {isAtLimit
                      ? 'Plan Limit Reached'
                      : 'Approaching Plan Limit'}
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
                          style={{ width: `${usagePercent}%` }}
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
          }
          return null;
        })()}

      {loading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {hasPermission('view_reports') && (
            <StatsCard
              title="Net Liquidity"
              amount={formatPKR(stats?.banking?.liquidity || 0)}
              subtitle="Available Cash"
              icon={<Coins size={20} />}
              color="bg-emerald-500 shadow-emerald-500/20"
            />
          )}
          {hasPermission('view_reports') && (
            <StatsCard
              title="Total Deposits"
              amount={formatPKR(stats?.banking?.deposits || 0)}
              subtitle="Member Capital"
              icon={<Download size={20} />}
              color="bg-blue-500 shadow-blue-500/20"
            />
          )}
          {hasPermission('view_reports') && (
            <StatsCard
              title="Net Profit"
              amount={formatPKR(stats?.profit?.amount || 0)}
              percentage={stats?.profit?.percentage}
              subtitle="Interest Earnings"
              icon={<TrendingUp size={20} />}
              color="bg-primary shadow-primary/20"
            />
          )}
          {hasAnyPermission(['view_reports', 'manage_loans']) && (
            <StatsCard
              title="Total Disbursed"
              amount={formatPKR(stats?.banking?.disbursed?.amount || 0)}
              percentage={stats?.banking?.disbursed?.percentage}
              subtitle="Portfolio Value"
              icon={<ExternalLink size={20} />}
              color="bg-orange-500 shadow-orange-500/20"
            />
          )}
          {/* <StatsCard
            title="Forecast (6M)"
            amount={formatPKR(stats?.forecast?.total6Months || 0)}
            percentage={stats?.forecast?.percentage}
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
          /> */}
        </div>
      )}

      {/* Calendar Section */}
      <div className="w-full">
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <RepaymentCalendar upcomingPayments={upcomingPayments} />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10 items-start">
        {hasAnyPermission([
          'view_reports',
          'manage_loans',
          'manage_members',
        ]) && (
          <div className="xl:col-span-1">
            {/* Transactions Section */}
            <div className="col-span-3 rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 pb-4 border-b border-border/50 bg-gradient-to-br from-card to-background/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      Recent Activity
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Real-time settlements
                    </p>
                  </div>
                  {!loading && (
                    <button
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => navigate('/transactions')}
                    >
                      View All
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="divide-y divide-border/50">
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="p-5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-muted/30 animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted/30 animate-pulse rounded" />
                            <div className="h-3 w-20 bg-muted/30 animate-pulse rounded" />
                          </div>
                        </div>
                        <div className="h-5 w-16 bg-muted/30 animate-pulse rounded" />
                      </div>
                    ))
                  ) : transactions.length === 0 ? (
                    <div className="p-6 sm:p-10 text-center text-muted-foreground text-sm font-medium">
                      No recent settlements detected
                    </div>
                  ) : (
                    transactions.slice(0, 3).map((t) => (
                      <div
                        key={t._id}
                        className="group flex items-center justify-between p-4 sm:p-5 hover:bg-primary/5 transition-colors duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div
                              className={`w-11 h-11 rounded-2xl ${t.type === 'repayment' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'} flex items-center justify-center border border-border/50 shadow-sm group-hover:scale-110 transition-transform`}
                            >
                              <span className="font-black text-xs capitalize">
                                {t.customer?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold leading-none tracking-tight capitalize">
                              {t.customer?.name}
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              {format(new Date(t.date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-black tracking-tight tabular-nums">
                            {formatPKR(t.amount)}
                          </p>
                          <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/80 dark:text-muted-foreground">
                            SUCCESS
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            'xl:col-span-2',
            !hasAnyPermission([
              'view_reports',
              'manage_loans',
              'manage_members',
            ]) && 'xl:col-span-3',
          )}
        >
          {hasPermission('view_reports') ? (
            loading ? (
              <ChartSkeleton />
            ) : (
              <AnalyticsChart
                data={analyticsData}
                dateRange={dateRange}
                setDateRange={setDateRange}
                onDownload={handleDownload}
                loading={chartLoading}
              />
            )
          ) : (
            <div className="h-[400px] flex items-center justify-center bg-card/50 rounded-[2rem] border border-border/50 text-muted-foreground p-8 text-center">
              <div>
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <h4 className="text-lg font-black tracking-tight mb-2">
                  Analytics Restricted
                </h4>
                <p className="text-sm">
                  You do not have permission to view detailed analytics reports.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
