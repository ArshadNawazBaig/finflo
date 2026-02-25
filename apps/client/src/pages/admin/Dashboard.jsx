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
              amount={formatCurrency(stats?.banking?.liquidity || 0)}
              subtitle="Available Cash"
              icon={<Coins size={20} />}
              color="bg-emerald-500 shadow-emerald-500/20"
            />
          )}
          {hasPermission('view_reports') && (
            <StatsCard
              title="Total Deposits"
              amount={formatCurrency(stats?.banking?.deposits || 0)}
              subtitle="Member Capital"
              icon={<Download size={20} />}
              color="bg-blue-500 shadow-blue-500/20"
            />
          )}
          {hasPermission('view_reports') && (
            <StatsCard
              title="Net Profit"
              amount={formatCurrency(stats?.profit?.amount || 0)}
              percentage={stats?.profit?.percentage}
              subtitle="Interest Earnings"
              icon={<TrendingUp size={20} />}
              color="bg-primary shadow-primary/20"
            />
          )}
          {hasAnyPermission(['view_reports', 'manage_loans']) && (
            <StatsCard
              title="Total Disbursed"
              amount={formatCurrency(stats?.banking?.disbursed?.amount || 0)}
              percentage={stats?.banking?.disbursed?.percentage}
              subtitle="Portfolio Value"
              icon={<ExternalLink size={20} />}
              color="bg-orange-500 shadow-orange-500/20"
            />
          )}
          {/* <StatsCard
            title="Forecast (6M)"
            amount={formatCurrency(stats?.forecast?.total6Months || 0)}
            percentage={stats?.forecast?.percentage}
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
          /> */}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
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
                className="h-full"
              />
            )
          ) : (
            <div className="h-[400px] flex items-center justify-center bg-card/50 rounded-[2rem] border border-border/50 text-muted-foreground p-8 text-center">
              <div>
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-black tracking-tight">
                  Premium Insights
                </h3>
                <p className="text-sm font-medium mt-1">
                  Access advanced analytics with the Pro plan
                </p>
              </div>
            </div>
          )}
        </div>

        {hasAnyPermission([
          'view_reports',
          'manage_loans',
          'manage_members',
        ]) && (
          <div className="xl:col-span-1">
            {/* Recent Activity Section */}
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
                  {!loading && (
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
                <div className="h-[324px] overflow-y-auto custom-scrollbar">
                  <ActivityFeed />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Calendar Section */}
      <div className="w-full">
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <RepaymentCalendar upcomingPayments={upcomingPayments} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
