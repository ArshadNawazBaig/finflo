import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Building2,
  Users,
  Wallet,
  HandCoins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Receipt,
  ShieldAlert,
  PiggyBank,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import TablePagination from '@/components/ui/table-pagination';
import api from '@/lib/axios';
import {
  formatFullCurrency as formatCurrency,
  formatCompactCurrency,
} from '@/lib/utils';
import { toast } from 'sonner';

const ROWS_PER_PAGE = 9;

const KPI_TILES = [
  {
    key: 'aum',
    label: 'AUM',
    icon: PiggyBank,
    tone: 'bg-purple-500/10 text-purple-500',
    valueTone: 'text-purple-600',
    format: 'currency',
  },
  {
    key: 'nplRatio',
    label: 'NPL ratio',
    icon: ShieldAlert,
    tone: 'bg-rose-500/10 text-rose-500',
    valueTone: 'text-rose-600',
    format: 'nplRatio',
  },
  {
    key: 'inflow30d',
    label: 'Inflow (30d)',
    icon: TrendingUp,
    tone: 'bg-emerald-500/10 text-emerald-500',
    valueTone: 'text-emerald-600',
    format: 'currency',
  },
  {
    key: 'outflow30d',
    label: 'Outflow (30d)',
    icon: TrendingDown,
    tone: 'bg-rose-500/10 text-rose-500',
    valueTone: 'text-rose-600',
    format: 'currency',
  },
  {
    key: 'totalInvested',
    label: 'Deposits',
    icon: Wallet,
    tone: 'bg-blue-500/10 text-blue-500',
    valueTone: 'text-blue-600',
    format: 'currency',
  },
  {
    key: 'activeLoans',
    label: 'Active loans',
    icon: Activity,
    tone: 'bg-primary/10 text-primary',
    valueTone: 'text-slate-900 dark:text-white',
    format: 'loanRatio',
  },
  {
    key: 'totalVolume',
    label: 'Disbursed',
    icon: HandCoins,
    tone: 'bg-emerald-500/10 text-emerald-500',
    valueTone: 'text-emerald-600',
    format: 'currency',
  },
  {
    key: 'totalOutstanding',
    label: 'Outstanding',
    icon: AlertTriangle,
    tone: 'bg-amber-500/10 text-amber-500',
    valueTone: 'text-amber-600',
    format: 'currency',
  },
  {
    key: 'totalProfit',
    label: 'Profit',
    icon: TrendingUp,
    tone: 'bg-indigo-500/10 text-indigo-500',
    valueTone: 'text-indigo-600',
    format: 'currency',
  },
  {
    key: 'totalExpenses',
    label: 'Expenses',
    icon: Receipt,
    tone: 'bg-rose-500/10 text-rose-500',
    valueTone: 'text-rose-600',
    format: 'currency',
  },
];

// Pill-style tab matching the Cash Flow Forecast toggle.
const AumViewTab = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all',
      active
        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
    )}
  >
    {children}
  </button>
);

// Custom backdrop-blurred tooltip — same visual language as the Cash Flow
// Forecast chart. `mode` controls which rows are shown.
const AumTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  const positiveNet = (row.net || 0) >= 0;
  return (
    <div className="bg-background/95 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5 min-w-[200px]">
      <p className="text-[10px] font-black text-muted-foreground mb-3 uppercase tracking-[0.2em] border-b border-border/50 pb-2">
        {row.name || label}
      </p>
      {mode === 'cumulative' ? (
        <div className="space-y-2.5">
          <AumTooltipRow
            label="AUM"
            value={row.aum}
            colorClass={row.aum >= 0 ? 'text-primary' : 'text-rose-500'}
            dotColor={row.aum >= 0 ? 'hsl(var(--primary))' : '#f43f5e'}
            bold
          />
          {row.net != null && (
            <AumTooltipRow
              label="Net flow"
              value={row.net}
              colorClass={positiveNet ? 'text-emerald-500' : 'text-rose-500'}
              dotColor={positiveNet ? '#10b981' : '#f43f5e'}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <AumTooltipRow
            label="Net flow"
            value={row.net}
            colorClass={positiveNet ? 'text-emerald-500' : 'text-rose-500'}
            dotColor={positiveNet ? '#10b981' : '#f43f5e'}
            bold
          />
          <div className="pt-2 mt-1 border-t border-border/50">
            <AumTooltipRow
              label="Running AUM"
              value={row.aum}
              colorClass="text-primary"
              dotColor="hsl(var(--primary))"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AumTooltipRow = ({ label, value, colorClass, dotColor, bold }) => (
  <div className="flex items-center justify-between gap-8">
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-wider">
        {label}
      </span>
    </div>
    <span className={cn('tabular-nums', bold ? 'text-sm font-black' : 'text-xs font-extrabold', colorClass)}>
      {formatCurrency(value || 0)}
    </span>
  </div>
);

const BranchCardSkeleton = () => (
  <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-6 space-y-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3 pt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      ))}
    </div>
  </div>
);

const BranchAnalyticsTab = () => {
  const [branchSummaries, setBranchSummaries] = useState(null);
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [branchPage, setBranchPage] = useState(1);
  const [aumTrend, setAumTrend] = useState(null);
  const [loadingAum, setLoadingAum] = useState(false);
  // View toggle for the AUM chart — 'cumulative' (running balance area) is
  // the default. 'bucketed' switches to per-month net-flow bars with the
  // running balance overlaid as a line.
  const [aumView, setAumView] = useState('cumulative');

  const fetchBranchSummaries = async () => {
    try {
      setLoadingBranch(true);
      const { data: bData } = await api.get('/reports/branch-summary');
      setBranchSummaries(bData);
    } catch (error) {
      toast.error('Failed to fetch Branch Summaries');
    } finally {
      setLoadingBranch(false);
    }
  };

  const fetchAumTrend = async () => {
    try {
      setLoadingAum(true);
      const { data } = await api.get('/reports/aum-trend', {
        params: { months: 12 },
      });
      setAumTrend(data);
    } catch {
      // Non-fatal — branch tiles remain usable without the trend chart.
    } finally {
      setLoadingAum(false);
    }
  };

  useEffect(() => {
    if (!branchSummaries) {
      fetchBranchSummaries();
    }
    if (!aumTrend) {
      fetchAumTrend();
    }
  }, []);

  // Roll-up across all branches for the header strip.
  const rollup = branchSummaries
    ? branchSummaries.reduce(
        (acc, b) => {
          acc.aum += b.stats.aum || 0;
          acc.inflow += b.stats.inflow30d || 0;
          acc.outflow += b.stats.outflow30d || 0;
          acc.nplOutstanding += b.stats.nplOutstanding || 0;
          acc.totalOutstanding += b.stats.totalOutstanding || 0;
          return acc;
        },
        { aum: 0, inflow: 0, outflow: 0, nplOutstanding: 0, totalOutstanding: 0 },
      )
    : null;
  const portfolioNpl =
    rollup && rollup.totalOutstanding > 0
      ? (rollup.nplOutstanding / rollup.totalOutstanding) * 100
      : 0;
  const aumDelta =
    aumTrend?.series?.length >= 2
      ? aumTrend.series.at(-1).aum - aumTrend.series.at(-2).aum
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      {/* Roll-up strip — portfolio totals across every branch in scope. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Total AUM',
            value: rollup ? formatCompactCurrency(rollup.aum) : '—',
            sub:
              aumDelta !== 0 && aumTrend
                ? `${aumDelta > 0 ? '+' : ''}${formatCompactCurrency(aumDelta)} vs last month`
                : '12-month series',
            icon: PiggyBank,
            tone: 'bg-purple-500/10 text-purple-500',
            valueTone: 'text-purple-600',
          },
          {
            label: 'Portfolio NPL',
            value: rollup ? `${portfolioNpl.toFixed(2)}%` : '—',
            sub: rollup
              ? `${formatCompactCurrency(rollup.nplOutstanding)} non-performing`
              : '—',
            icon: ShieldAlert,
            tone: 'bg-rose-500/10 text-rose-500',
            valueTone: 'text-rose-600',
          },
          {
            label: 'Inflow (30d)',
            value: rollup ? formatCompactCurrency(rollup.inflow) : '—',
            sub: 'Deposits + repayments + income',
            icon: TrendingUp,
            tone: 'bg-emerald-500/10 text-emerald-500',
            valueTone: 'text-emerald-600',
          },
          {
            label: 'Outflow (30d)',
            value: rollup ? formatCompactCurrency(rollup.outflow) : '—',
            sub: 'Disbursements + withdrawals + expenses',
            icon: TrendingDown,
            tone: 'bg-rose-500/10 text-rose-500',
            valueTone: 'text-rose-600',
          },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className="rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {tile.label}
                </p>
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${tile.tone}`}
                >
                  <Icon size={14} />
                </div>
              </div>
              <p
                className={`text-lg sm:text-xl font-extrabold tabular-nums tracking-tight ${tile.valueTone}`}
              >
                {tile.value}
              </p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 truncate">
                {tile.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* AUM Trend Chart — modern composed chart with view toggle, matching
          the Cash Flow Forecast visual language. */}
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden transition-all duration-300">
        <CardHeader className="p-4 sm:p-6 pb-3 bg-muted/10 border-b border-border/30">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-2xl shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-black tracking-tight truncate">
                  AUM Trend
                </CardTitle>
                <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mt-0.5 truncate">
                  {aumView === 'cumulative'
                    ? 'Running assets under management · last 12 months'
                    : 'Monthly net flow · last 12 months · line is running AUM'}
                </CardDescription>
              </div>
            </div>
            <div className="inline-flex rounded-full p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
              <AumViewTab
                active={aumView === 'cumulative'}
                onClick={() => setAumView('cumulative')}
              >
                Cumulative
              </AumViewTab>
              <AumViewTab
                active={aumView === 'bucketed'}
                onClick={() => setAumView('bucketed')}
              >
                Monthly
              </AumViewTab>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loadingAum ? (
            <Skeleton className="h-[320px] w-full rounded-2xl" />
          ) : aumTrend?.series?.length ? (
            <div className="h-[320px] w-full -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                {aumView === 'cumulative' ? (
                  <AreaChart
                    data={aumTrend.series}
                    margin={{ top: 16, right: 12, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="aum-pos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted-foreground)/0.15)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      className="font-bold uppercase tracking-widest opacity-60"
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      width={66}
                      className="font-bold opacity-50"
                    />
                    <ReferenceLine
                      y={0}
                      stroke="hsl(var(--muted-foreground)/0.5)"
                      strokeDasharray="4 4"
                    />
                    <Tooltip
                      content={<AumTooltip mode="cumulative" />}
                      cursor={{
                        stroke: 'hsl(var(--primary))',
                        strokeWidth: 1,
                        strokeDasharray: '4 4',
                      }}
                      animationDuration={150}
                    />
                    <Area
                      type="monotone"
                      dataKey="aum"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fill="url(#aum-pos)"
                      activeDot={{
                        r: 6,
                        strokeWidth: 3,
                        stroke: 'hsl(var(--background))',
                        fill: 'hsl(var(--primary))',
                      }}
                      animationDuration={1200}
                    />
                  </AreaChart>
                ) : (
                  <ComposedChart
                    data={aumTrend.series.map((s) => ({
                      ...s,
                      netPos: s.net > 0 ? s.net : 0,
                      netNeg: s.net < 0 ? s.net : 0,
                    }))}
                    margin={{ top: 16, right: 12, left: 4, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="aum-flow-pos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
                      </linearGradient>
                      <linearGradient id="aum-flow-neg" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted-foreground)/0.15)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      className="font-bold uppercase tracking-widest opacity-60"
                    />
                    <YAxis
                      yAxisId="flow"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompactCurrency(Math.abs(v))}
                      width={66}
                      className="font-bold opacity-50"
                    />
                    <YAxis
                      yAxisId="aum"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      width={66}
                      className="font-bold opacity-50"
                    />
                    <ReferenceLine
                      yAxisId="flow"
                      y={0}
                      stroke="hsl(var(--muted-foreground)/0.4)"
                    />
                    <Tooltip
                      content={<AumTooltip mode="bucketed" />}
                      cursor={{ fill: 'hsl(var(--primary)/0.06)' }}
                      animationDuration={150}
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="netPos"
                      name="Net inflow"
                      fill="url(#aum-flow-pos)"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={36}
                      animationDuration={900}
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="netNeg"
                      name="Net outflow"
                      fill="url(#aum-flow-neg)"
                      radius={[0, 0, 10, 10]}
                      maxBarSize={36}
                      animationDuration={900}
                    />
                    <Line
                      yAxisId="aum"
                      type="monotone"
                      dataKey="aum"
                      name="Running AUM"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        strokeWidth: 2,
                        stroke: 'hsl(var(--background))',
                        fill: 'hsl(var(--primary))',
                      }}
                      activeDot={{
                        r: 6,
                        strokeWidth: 3,
                        stroke: 'hsl(var(--background))',
                        fill: 'hsl(var(--primary))',
                      }}
                      animationDuration={1100}
                    />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs font-medium text-muted-foreground">
              No AUM history available yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden transition-all duration-300">
        <CardHeader className="p-4 sm:p-6 pb-3 bg-muted/10 border-b border-border/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 rounded-2xl shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
                <Building2 size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-black tracking-tight truncate">
                  Cross-Branch Comparison
                </CardTitle>
                <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mt-0.5 truncate">
                  Aggregated KPIs per branch
                </CardDescription>
              </div>
            </div>
            {branchSummaries && branchSummaries.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                {branchSummaries.length}{' '}
                {branchSummaries.length === 1 ? 'branch' : 'branches'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loadingBranch ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <BranchCardSkeleton key={i} />
              ))}
            </div>
          ) : branchSummaries && branchSummaries.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {branchSummaries
                  .slice(
                    (branchPage - 1) * ROWS_PER_PAGE,
                    branchPage * ROWS_PER_PAGE,
                  )
                  .map((branch) => (
                    <div
                      key={branch._id}
                      className="group relative rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.18)]"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Building2 size={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white capitalize truncate">
                              {branch.name}
                            </h3>
                            {branch.code && (
                              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                                {branch.code}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06]">
                            <Users
                              size={11}
                              className="text-slate-400 dark:text-slate-500"
                            />
                            <span className="text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
                              {branch.stats.totalMembers}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mt-1">
                            Members
                          </p>
                        </div>
                      </div>

                      {/* KPI Grid */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06] mt-1">
                        {KPI_TILES.map((tile) => {
                          const Icon = tile.icon;
                          const raw = branch.stats[tile.key];
                          let display;
                          if (tile.format === 'currency') {
                            display = formatCurrency(raw || 0);
                          } else if (tile.format === 'loanRatio') {
                            display = (
                              <>
                                {branch.stats.activeLoans}
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                                  / {branch.stats.totalLoans}
                                </span>
                              </>
                            );
                          } else if (tile.format === 'nplRatio') {
                            const pct = ((raw || 0) * 100).toFixed(2);
                            display = (
                              <>
                                {pct}%
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-1">
                                  · {branch.stats.nplCount} loan
                                  {branch.stats.nplCount === 1 ? '' : 's'}
                                </span>
                              </>
                            );
                          } else {
                            display = raw ?? 0;
                          }
                          return (
                            <div
                              key={tile.key}
                              className="mt-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                  {tile.label}
                                </p>
                                <div
                                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${tile.tone}`}
                                >
                                  <Icon size={11} />
                                </div>
                              </div>
                              <p
                                className={`text-sm font-extrabold tracking-tight tabular-nums truncate ${tile.valueTone}`}
                              >
                                {display}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
              {branchSummaries.length > ROWS_PER_PAGE && (
                <div className="pt-4">
                  <TablePagination
                    currentPage={branchPage}
                    totalPages={Math.ceil(
                      branchSummaries.length / ROWS_PER_PAGE,
                    )}
                    onPageChange={setBranchPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center min-h-[300px] flex items-center justify-center border border-dashed border-slate-200 dark:border-white/[0.08] rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <Building2 size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No branch data available
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Ensure you have active branches with data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchAnalyticsTab;
