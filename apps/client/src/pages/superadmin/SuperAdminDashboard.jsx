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
  BarChart3,
} from 'lucide-react';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/PageHeader';
import SendNotificationModal from '@/components/notifications/SendNotificationModal';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import QuickActionsSkeleton from '@/components/skeletons/QuickActionsSkeleton';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
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
  const navigate = useNavigate();

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

  const QUICK_ACTIONS = [
    {
      label: 'Platforms',
      description: 'Manage businesses',
      icon: <Building2 size={22} />,
      route: '/super-admin/users',
      iconBg: 'bg-primary',
      glow: 'hover:shadow-primary/20',
      accent: 'text-primary',
    },
    {
      label: 'Global Alert',
      description: 'Broadcast to all',
      icon: <Send size={22} />,
      action: () => setIsNotificationModalOpen(true),
      iconBg: 'bg-emerald-500',
      glow: 'hover:shadow-emerald-500/20',
      accent: 'text-emerald-500',
    },
    {
      label: 'System Analytics',
      description: 'Deep performance',
      icon: <BarChart3 size={22} />,
      route: '/super-admin/analytics',
      iconBg: 'bg-amber-500',
      glow: 'hover:shadow-amber-500/20',
      accent: 'text-amber-500',
    },
    {
      label: 'Support Tickets',
      description: 'Review requests',
      icon: <Activity size={22} />,
      route: '/super-admin/tickets',
      iconBg: 'bg-indigo-500',
      glow: 'hover:shadow-indigo-500/20',
      accent: 'text-indigo-500',
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
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        {loading ? (
          <QuickActionsSkeleton count={4} />
        ) : (
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={action.action || (() => navigate(action.route))}
                className={cn(
                  'group relative overflow-hidden flex-1 min-w-[240px] flex items-center gap-4 rounded-full border border-border/40 bg-card/40 backdrop-blur-md p-2 pr-5 transition-all duration-300 hover:border-border/80 hover:-translate-y-0.5 hover:shadow-lg',
                  action.glow,
                )}
              >
                <div
                  className={cn(
                    'absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500',
                    action.iconBg,
                  )}
                />

                <div
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3',
                    action.iconBg,
                  )}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  {action.icon}
                </div>

                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                  <p
                    className={cn(
                      'text-sm font-black tracking-tight truncate leading-tight',
                      action.accent,
                    )}
                  >
                    {action.label}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 truncate uppercase tracking-widest mt-0.5 leading-tight">
                    {action.description}
                  </p>
                </div>

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
        )}
      </div>

      {/* Stats Cards */}
      <div className="mb-10">
        {loading ? (
          <CardsSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {statCards.map((stat, i) => (
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
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          <ChartSkeleton />
        ) : (
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
            <CardHeader className="pb-2 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">
                    Business Growth
                  </CardTitle>
                  <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 mt-1">
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
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
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
        )}

        {/* Plan Distribution (Donut Chart) */}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
            <CardHeader className="pb-2 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">
                    Premium Distribution
                  </CardTitle>
                  <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 mt-1">
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Signups */}
        <Card className="lg:col-span-2 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Recent Platforms
                </CardTitle>
                <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 mt-1">
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
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-muted/30 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3 rounded-lg bg-muted/30" />
                        <Skeleton className="h-3 w-1/4 rounded-lg bg-muted/20" />
                      </div>
                    </div>
                  </div>
                ))
              ) : stats?.recentUsers?.length > 0 ? (
                stats.recentUsers.map((user) => (
                  <div
                    key={user._id}
                    className="group flex items-center justify-between p-4 sm:p-5 hover:bg-primary/5 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg group-hover:scale-110 transition-transform">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-sm tracking-tight capitalize">
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
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3">
                  <Activity className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium">No new platforms yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Panel */}
        <div className="space-y-8">
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-4 border-b border-border/40 bg-gradient-to-br from-indigo-500/5 to-primary/5">
              <CardTitle className="text-lg font-black tracking-tight">
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Signups this week</span>
                  <span className="text-emerald-500 flex items-center gap-1 font-black">
                    <ArrowUpRight size={14} /> {stats?.recentSignups || 0}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(((stats?.recentSignups || 0) / (stats?.totalUsers || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    Members
                  </p>
                  <p className="text-2xl font-black tabular-nums">
                    {stats?.totalMembers || 0}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                    Active Loans
                  </p>
                  <p className="text-2xl font-black tabular-nums">
                    {stats?.activeLoans || 0}
                  </p>
                </div>
              </div>
            </CardContent>

            {/* System Health Section moved inside or kept as a separate card below? 
                User said "exactly same", I'll keep the health element as its own premium card below. */}
          </Card>

          {/* System Health Card */}
          <Card className="border border-border/50 bg-gradient-to-br from-card to-emerald-500/5 shadow-sm rounded-[2rem]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-pulse border border-emerald-500/20">
                  <Activity size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight uppercase">
                    System Status
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Operational
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
