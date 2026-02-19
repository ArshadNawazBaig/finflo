import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Search,
  Download,
} from 'lucide-react';
import { useRef, useCallback } from 'react';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import StatsCard from '@/components/StatsCard';
import PaymentCard from '@/components/payments/PaymentCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Pagination from '@/components/ui/Pagination';

const RevenueReports = () => {
  const [overview, setOverview] = useState(null);
  const [revenueByPlan, setRevenueByPlan] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(5);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setLimit(3);
    } else {
      setLimit(10);
    }
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
                    {entry.name === 'revenue' ? 'Revenue:' : entry.name}:
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <PageHeader
        title="Revenue & Financial Reports"
        description="Track revenue, MRR, and subscription metrics"
      />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-[2rem] border border-border/50 bg-card/50 animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[450px] rounded-3xl" />
            <Skeleton className="h-[450px] rounded-3xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
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
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight">
                      Revenue Trend
                    </CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                      Monthly Revenue (6 Months)
                    </CardDescription>
                  </div>
                  <div className="bg-primary/5 p-2 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-primary" />
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
                        dataKey="revenue"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Plan */}
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight">
                      Revenue by Plan
                    </CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                      Subscription Distribution
                    </CardDescription>
                  </div>
                  <div className="bg-purple-500/5 p-2 rounded-xl">
                    <DollarSign className="w-4 h-4 text-purple-600" />
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
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-lg font-black tracking-tight">
                  Subscription Metrics
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  User Activity Overview
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-4xl font-black text-primary mb-2">
                      {metrics.activeCount}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Active Businesses
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-black text-destructive mb-2">
                      {metrics.churnRate.toFixed(1)}%
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Churn Rate
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-black text-green-600 mb-2">
                      {metrics.newUsersThisMonth}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      New This Month
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-black mb-2">
                      {metrics.totalUsers}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Businesses
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {(payments.length > 0 || search !== '') && (
            <div className="bg-card/30 backdrop-blur-md rounded-[2rem] border border-border/50 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border/40 bg-muted/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter">
                      Payment History
                    </h3>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mt-0.5">
                      Complete Audit of Revenue Streams
                    </p>
                  </div>
                  <div className="relative group flex-1 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <input
                      type="text"
                      placeholder="Search by user or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                    />
                    <div className="absolute inset-0 rounded-xl animate-shimmer pointer-events-none opacity-0 group-focus-within:opacity-10" />
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
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                          User
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Plan
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Amount
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-12 text-center text-muted-foreground font-black uppercase tracking-[0.2em] text-[10px]"
                          >
                            No payment history found
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr
                            key={payment._id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm">
                                <p className="font-medium">
                                  {payment.user.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.user.email}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                {payment.plan}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-green-600">
                                ${payment.amount}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar size={14} />
                                {new Date(payment.date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                  payment.status === 'active'
                                    ? 'bg-green-500/10 text-green-600'
                                    : 'bg-red-500/10 text-red-600'
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
                <div className="p-6 border-t border-border/50">
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
