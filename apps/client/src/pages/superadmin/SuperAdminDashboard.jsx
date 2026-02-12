import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Send,
  ArrowRight,
} from 'lucide-react';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import SendNotificationModal from '@/components/SendNotificationModal';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import StatsCard from '@/components/StatsCard';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/super-admin/dashboard');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Businesses',
      amount: stats?.totalUsers || 0,
      icon: <Building2 size={20} />,
      color: 'bg-blue-500 shadow-blue-500/20',
      subtitle: `${stats?.activeUsers || 0} active platforms`,
    },
    {
      title: 'Total Customers',
      amount: stats?.totalCustomers || 0,
      icon: <Users size={20} />,
      color: 'bg-emerald-500 shadow-emerald-500/20',
      subtitle: 'Distributed across businesses',
    },
    {
      title: 'Total Loans',
      amount: stats?.totalLoans || 0,
      icon: <CreditCard size={20} />,
      color: 'bg-purple-500 shadow-purple-500/20',
      subtitle: `${stats?.activeLoans || 0} currently active`,
    },
    {
      title: 'Monthly Revenue',
      amount: `$${stats?.monthlyRevenue?.toLocaleString() || 0}`,
      icon: <DollarSign size={20} />,
      color: 'bg-amber-500 shadow-amber-500/20',
      subtitle: 'Estimated recurring revenue',
    },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Pro':
        return 'btn-gradient text-white';
      case 'Basic':
        return 'bg-indigo-500/10 text-indigo-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
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
                    {entry.name === 'count' ? 'New Signups:' : 'Value:'}
                  </span>
                  {entry.value}
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Platform Overview"
          description="Welcome back, Super Admin. Here's a real-time summary of the platform."
        />
        <Button
          onClick={() => setIsNotificationModalOpen(true)}
          variant="gradient"
          className="px-8 py-4 rounded-full flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest w-full md:w-auto"
        >
          <Send className="w-4 h-4" />
          Global Notification
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl shadow-sm" />
            ))
          : statCards.map((stat, i) => (
              <StatsCard
                key={i}
                title={stat.title}
                amount={stat.amount}
                icon={stat.icon}
                color={stat.color}
                subtitle={stat.subtitle}
              />
            ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Signup Trend Chart */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Business Growth
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  New Signups (Last 30 Days)
                </CardDescription>
              </div>
              <div className="bg-primary/5 p-2 rounded-xl">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.signupTrend || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorSignups"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="_id"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontWeight: 600,
                    }}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSignups)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution (Donut Chart) */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Premium Distribution
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Users by Plan
                </CardDescription>
              </div>
              <div className="bg-purple-500/5 p-2 rounded-xl">
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.usersByPlan || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {(stats?.usersByPlan || []).map((entry, index) => (
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
                            <p className="text-xs font-bold mb-1">
                              {payload[0].payload._id} Plan
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payload[0].value} Users
                            </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Signups */}
        <Card className="lg:col-span-2 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Recent Platforms
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Latest businesses to join the network
                </CardDescription>
              </div>
              <Link
                to="/super-admin/users"
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-70 transition-opacity flex items-center gap-2"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl w-full" />
                ))
              ) : stats?.recentUsers?.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all border border-border/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock size={12} />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getPlanColor(user.plan)}`}
                      >
                        {user.plan}
                      </span>
                      {user.isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No new platforms yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Panel */}
        <div className="space-y-8">
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 bg-gradient-to-br from-indigo-500/5 to-primary/5">
              <CardTitle className="text-lg font-black tracking-tight">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Signups this week</span>
                  <span className="text-emerald-500 flex items-center gap-1">
                    <ArrowUpRight size={14} /> {stats?.recentSignups || 0}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(((stats?.recentSignups || 0) / (stats?.totalUsers || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Members
                  </p>
                  <p className="text-xl font-black">
                    {stats?.totalMembers || 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Active Loans
                  </p>
                  <p className="text-xl font-black">
                    {stats?.activeLoans || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Card */}
          <Card className="border border-border/50 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-pulse">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="font-black tracking-tight">System Status</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600">
                      All systems operational
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SendNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;
