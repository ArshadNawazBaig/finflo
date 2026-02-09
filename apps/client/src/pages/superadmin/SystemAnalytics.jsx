import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import { formatCompactValue, formatPKR } from '@/lib/utils';

const SystemAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await api.get('/super-admin/analytics');
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Format data for charts
  const userGrowthData =
    analytics?.userGrowth?.map((item) => ({
      name: item._id,
      users: item.count,
    })) || [];

  const loanVolumeData =
    analytics?.loanVolume?.map((item) => ({
      name: item._id,
      loans: item.count,
      amount: item.totalAmount,
    })) || [];

  const planDistributionData =
    analytics?.planDistribution?.map((item) => ({
      name: item._id,
      value: item.count,
    })) || [];

  const topUsersData =
    analytics?.topUsersByLoans?.slice(0, 5).map((user) => ({
      name: user.businessName || user.name || user.email,
      loans: user.loanCount,
      amount: user.totalAmount,
    })) || [];

  const COLORS = {
    Pro: '#8b5cf6', // Violet
    Basic: '#ec4899', // Pink
    Free: '#94a3b8', // Slate
  };

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
                    {entry.name === 'users'
                      ? 'New Users:'
                      : entry.name === 'loans'
                        ? 'Loans Issued:'
                        : entry.name === 'amount'
                          ? 'Volume:'
                          : entry.name === 'value'
                            ? 'Users:'
                            : ''}
                  </span>
                  {entry.name === 'amount' || entry.name === 'totalAmount'
                    ? formatPKR(entry.value)
                    : entry.value}
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <PageHeader
        title="System Analytics"
        description="Real-time platform intelligence and growth metrics."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Growth Chart */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  User Growth
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  New Signups (6 Months)
                </CardDescription>
              </div>
              <div className="bg-primary/5 p-2 rounded-xl">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              {loading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={userGrowthData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorUsers"
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
                      dataKey="name"
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
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loan Activity Chart */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Loan Activity
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Volume & Amount
                </CardDescription>
              </div>
              <div className="bg-emerald-500/5 p-2 rounded-xl">
                <CreditCard className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              {loading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={loanVolumeData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorLoanCount"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#059669"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorLoanAmount"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted-foreground)/0.1)"
                    />
                    <XAxis
                      dataKey="name"
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
                      yAxisId="left"
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
                    <YAxis
                      yAxisId="right"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(val) => formatCompactValue(val)}
                      tick={{
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="loans"
                      name="loans"
                      fill="url(#colorLoanCount)"
                      radius={[8, 8, 0, 0]}
                      barSize={20}
                      animationDuration={2000}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="amount"
                      name="amount"
                      fill="url(#colorLoanAmount)"
                      radius={[8, 8, 0, 0]}
                      barSize={20}
                      animationDuration={2000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Share Chart */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Market Share
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Subscription Distribution
                </CardDescription>
              </div>
              <div className="bg-violet-500/5 p-2 rounded-xl">
                <PieChartIcon className="w-4 h-4 text-violet-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              {loading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={6}
                      dataKey="value"
                      cornerRadius={8}
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[entry.name] || '#94a3b8'}
                          stroke="none"
                          className="hover:opacity-80 transition-opacity duration-300 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Legend
                      iconType="circle"
                      layout="horizontal"
                      verticalAlign="bottom"
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers Chart */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Top Performers
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Users by Loan Volume
                </CardDescription>
              </div>
              <div className="bg-orange-500/5 p-2 rounded-xl">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              {loading ? (
                <Skeleton className="w-full h-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topUsersData}
                    margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
                    barCategoryGap="20%"
                  >
                    <defs>
                      <linearGradient
                        id="colorTopLoans"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#fb923c"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--muted-foreground)/0.1)"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                      width={100}
                      tick={{
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar
                      dataKey="loans"
                      name="loans"
                      fill="url(#colorTopLoans)"
                      radius={[0, 8, 8, 0]}
                      barSize={24}
                      animationDuration={2000}
                      background={{
                        fill: 'hsl(var(--muted)/0.3)',
                        radius: [0, 8, 8, 0],
                      }}
                    >
                      {topUsersData.map((entry, index) => (
                        <Cell key={`cell-${index}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemAnalytics;
