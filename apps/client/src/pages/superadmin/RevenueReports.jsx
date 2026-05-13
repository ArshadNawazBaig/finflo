import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Search,
} from 'lucide-react';
import { useRef } from 'react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportsSkeleton } from '@/components/ui/PageSkeletons';
import StatsCard from '@/components/StatsCard';
import PaymentCard from '@/components/payments/PaymentCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Pagination from '@/components/ui/Pagination';
import { useIsMobile } from '@/hooks/useIsMobile';

const RevenueReports = () => {
  const [overview, setOverview] = useState(null);
  const [revenueByPlan, setRevenueByPlan] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const isMobile = useIsMobile();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewRes, planRes, metricsRes, historyRes] = await Promise.all([
        api.get('/revenue/overview'),
        api.get('/revenue/by-plan'),
        api.get('/revenue/metrics'),
        api.get('/revenue/history?months=6'),
      ]);

      setOverview(overviewRes.data);
      setRevenueByPlan(planRes.data);
      setMetrics(metricsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      toast.error('Failed to fetch revenue data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (page = 1, isAppend = false) => {
    try {
      if (isAppend) setIsFetchingMore(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
      });
      const { data } = await api.get(`/revenue/payments?${params}`);

      if (isAppend) {
        setPayments((prev) => {
          const newPayments = data.payments.filter(
            (p) => !prev.some((existing) => existing._id === p._id),
          );
          return [...prev, ...newPayments];
        });
      } else {
        setPayments(data.payments);
      }

      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      if (isAppend) setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          pagination.page < pagination.pages
        ) {
          fetchPayments(pagination.page + 1, true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, pagination]);

  useEffect(() => {
    fetchData();
    fetchPayments();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPayments(1);
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, limit]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/90 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-xl">
          <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <p className="text-xs font-bold">
                  <span className="text-muted-foreground font-medium mr-1">
                    {entry.name === 'revenue'
                      ? 'Revenue:'
                      : entry.name === 'estimatedMrr'
                        ? 'Projected:'
                        : entry.name}
                    :
                  </span>
                  ${entry.value?.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading && !overview) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Super admin
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
            Revenue & financial <span className="text-primary">reports</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Track revenue, MRR, and subscription metrics across the platform.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-10">
          <CardsSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
            <div className="p-12 flex justify-center">
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {overview && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatsCard
                title="Total Revenue"
                amount={`$${overview.totalRevenue.toLocaleString()}`}
                icon={<DollarSign size={20} />}
                color="bg-blue-500 shadow-blue-500/20"
              />
              <StatsCard
                title="Monthly Recurring Revenue"
                amount={`$${overview.mrr.toLocaleString()}`}
                icon={<TrendingUp size={20} />}
                color="bg-purple-500 shadow-purple-500/20"
                percentage={overview.growthRate}
                subtitle="MoM Growth"
              />
              <StatsCard
                title="Avg Revenue Per Business"
                amount={`$${Math.round(overview.arpu).toLocaleString()}`}
                icon={<Users size={20} />}
                color="bg-emerald-500 shadow-emerald-500/20"
              />
              <StatsCard
                title="Active Businesses"
                amount={overview.totalActiveBusinesses}
                icon={<CreditCard size={20} />}
                color="bg-amber-500 shadow-amber-500/20"
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue History */}
            <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
              <CardHeader className="p-5 sm:p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      Trend
                    </p>
                    <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                      Revenue trend
                    </CardTitle>
                    <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Monthly revenue (6 months)
                    </CardDescription>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={history}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorRevenue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
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
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        dy={10}
                        tick={{
                          fill: 'hsl(var(--muted-foreground))',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                      <YAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        tick={{
                          fill: 'hsl(var(--muted-foreground))',
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{
                          stroke: 'hsl(var(--primary))',
                          strokeWidth: 1,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="estimatedMrr"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="transparent"
                        animationDuration={2000}
                        name="estimatedMrr"
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        animationDuration={2000}
                        name="revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Plan */}
            <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
              <CardHeader className="p-5 sm:p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      Plans
                    </p>
                    <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                      Revenue by plan
                    </CardTitle>
                    <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Subscription distribution
                    </CardDescription>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter
                          id="shadow"
                          x="-50%"
                          y="-50%"
                          width="200%"
                          height="200%"
                        >
                          <feDropShadow
                            dx="0"
                            dy="4"
                            stdDeviation="4"
                            floodOpacity="0.15"
                          />
                        </filter>
                      </defs>
                      <Pie
                        data={revenueByPlan}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="monthlyRevenue"
                        label={({
                          plan,
                          monthlyRevenue,
                          cx,
                          cy,
                          midAngle,
                          innerRadius,
                          outerRadius,
                        }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 25;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="hsl(var(--foreground))"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              className="text-xs font-bold"
                            >
                              {plan}: ${monthlyRevenue}
                            </text>
                          );
                        }}
                      >
                        {revenueByPlan.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background/90 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-xl">
                                <p className="text-xs font-bold mb-2">
                                  {payload[0].payload.plan} Plan
                                </p>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Users:</span>{' '}
                                    {payload[0].payload.users}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      Revenue:
                                    </span>{' '}
                                    ${payload[0].value}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Metrics */}
          {metrics && (
            <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
              <CardHeader className="p-5 sm:p-6 pb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Metrics
                </p>
                <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Subscription metrics
                </CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  User activity overview
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 sm:px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                      Active businesses
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight tabular-nums text-primary">
                      {metrics.activeCount}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                      Churn rate
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight tabular-nums text-rose-500">
                      {metrics.churnRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                      New this month
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight tabular-nums text-emerald-600">
                      {metrics.newUsersThisMonth}
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                      Total businesses
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      {metrics.totalUsers}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {(payments.length > 0 || search !== '') && (
            <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      Payments
                    </p>
                    <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                      Payment history
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Complete audit of revenue streams
                    </p>
                  </div>
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 z-10" />
                    <input
                      type="text"
                      placeholder="Search by user or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-[12px] font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                    />
                  </div>
                </div>
              </div>

              {isMobile ? (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {payments.map((payment) => (
                      <PaymentCard key={payment._id} payment={payment} />
                    ))}
                  </div>

                  {/* Infinite Scroll Trigger */}
                  {pagination.page < pagination.pages && (
                    <div ref={observerTarget}>
                      <InfiniteLoader isFetchingMore={isFetchingMore} />
                    </div>
                  )}

                  {payments.length === 0 && !loading && (
                    <div className="py-12 text-center text-muted-foreground">
                      No payment history found.
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/60 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06]">
                      <tr>
                        <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          User
                        </th>
                        <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          Plan
                        </th>
                        <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          Amount
                        </th>
                        <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          Date
                        </th>
                        <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                      {payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.15em] text-[10px]"
                          >
                            No payment history found
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr
                            key={payment._id}
                            className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-extrabold text-[13px] capitalize tracking-tight text-slate-900 dark:text-white">
                                  {payment.user.name}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  {payment.user.email}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] bg-primary/10 text-primary">
                                {payment.plan}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-extrabold text-[13px] text-emerald-600 tabular-nums">
                                ${payment.amount}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                                <Calendar size={12} />
                                {new Date(payment.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] ${
                                  payment.status === 'active'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-rose-500/10 text-rose-600'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {!isMobile && pagination.total > 0 && (
                <div className="p-5 border-t border-slate-100 dark:border-white/[0.06]">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    totalEntries={pagination.total}
                    limit={limit}
                    onPageChange={(page) => fetchPayments(page)}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit);
                      fetchPayments(1);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RevenueReports;
