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
import { AdminDashboardSkeleton } from '@/components/ui/PageSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
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

  if (loading && stats === null) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Super admin
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
            Platform <span className="text-primary">overview</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Welcome back, Super Admin. Here&apos;s a real-time summary of the platform.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        {loading ? (
          <QuickActionsSkeleton count={4} />
        ) : (
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={action.action || (() => navigate(action.route))}
                className="group relative overflow-hidden flex-1 min-w-[240px] flex items-center gap-3.5 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-2 pr-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.15)]"
              >
                <div
                  className={cn(
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-105',
                    action.iconBg,
                  )}
                >
                  {action.icon}
                </div>

                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                  <p className="text-[13px] font-extrabold tracking-tight truncate leading-tight text-slate-900 dark:text-white">
                    {action.label}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-tight">
                    {action.description}
                  </p>
                </div>

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
          <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                    Growth
                  </p>
                  <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                    Business growth
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    New signups (last 30 days)
                  </CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
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
          <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                    Plans
                  </p>
                  <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                    Premium distribution
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    Users by plan
                  </CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
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
        <Card className="lg:col-span-2 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Platforms
                </p>
                <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Recent platforms
                </CardTitle>
                <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest businesses to join the network
                </CardDescription>
              </div>
              <Link
                to="/super-admin/users"
                className="text-[11px] font-bold px-3 py-1.5 h-auto rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all gap-1 inline-flex items-center"
              >
                View all
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
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
                    className="group flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold text-sm group-hover:scale-105 transition-transform">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white capitalize">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                          <Clock size={11} />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] ${getPlanColor(user.plan)}`}
                      >
                        {user.plan}
                      </span>
                      {user.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-6 flex flex-col items-center gap-3">
                  <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Empty
                  </p>
                  <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                    No new platforms yet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    New businesses will appear here as they sign up.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Panel */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none overflow-hidden h-full flex flex-col">
            <CardHeader className="p-5 sm:p-6 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Snapshot
              </p>
              <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                Quick stats
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 sm:px-6 pb-6 space-y-6 flex-1">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Signups this week
                  </span>
                  <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-extrabold tabular-nums">
                    <ArrowUpRight size={12} strokeWidth={3} /> {stats?.recentSignups || 0}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(((stats?.recentSignups || 0) / (stats?.totalUsers || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                    Members
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                    {stats?.totalMembers || 0}
                  </p>
                </div>
                <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                    Active loans
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                    {stats?.activeLoans || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Card */}
          <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    System status
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-extrabold tracking-[-0.025em] text-emerald-600">
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
