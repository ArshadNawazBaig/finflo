import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CalendarRange,
  Activity,
  BarChart3,
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
} from 'recharts';
import api from '@/lib/axios';
import { formatCurrency, formatCompactValue, formatDate, cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

const HORIZON_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
];

const StatCard = ({ label, value, hint, icon: Icon, tone = 'neutral' }) => {
  const toneClasses = {
    inflow: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    outflow: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
    neutral: 'text-slate-600 dark:text-slate-300 bg-slate-500/10',
    warning: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  }[tone];

  return (
    <Card className="border-slate-100 dark:border-white/[0.06]">
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hint}
            </p>
          )}
        </div>
        <div className={cn('rounded-2xl p-3 shrink-0', toneClasses)}>
          <Icon size={18} />
        </div>
      </CardContent>
    </Card>
  );
};

const CashFlowForecast = () => {
  const [horizon, setHorizon] = useState('90');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: resp } = await api.get(`/cash-flow-forecast?horizon=${horizon}`);
      setData(resp);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon]);

  const [view, setView] = useState('bucketed'); // 'bucketed' | 'cumulative'
  const [activeBucket, setActiveBucket] = useState(null);

  // Bucketed view: inflow stays positive, outflow is mirrored below zero so
  // the chart reads like a price chart — green up, red down — with the running
  // net line slicing through. Far more legible than side-by-side bars.
  const bucketedChartData = useMemo(() => {
    if (!data?.buckets) return [];
    let running = 0;
    return data.buckets.map((b, i) => {
      running += b.net;
      return {
        name: b.label,
        shortName: `D${i * 10 + 1}-${(i + 1) * 10}`,
        inflow: b.inflow,
        outflowNeg: -b.outflow, // mirror for downward area
        outflow: b.outflow,
        net: b.net,
        runningNet: running,
        startDate: b.startDate,
        endDate: b.endDate,
      };
    });
  }, [data]);

  // Cumulative view: how the projected cash position evolves day-by-bucket.
  const cumulativeChartData = useMemo(() => {
    if (!data?.buckets) return [];
    let running = 0;
    const rows = [{ name: 'Today', shortName: 'Now', balance: 0 }];
    for (let i = 0; i < data.buckets.length; i++) {
      const b = data.buckets[i];
      running += b.net;
      rows.push({
        name: b.label,
        shortName: `D${(i + 1) * 10}`,
        balance: running,
        inflow: b.inflow,
        outflow: b.outflow,
      });
    }
    return rows;
  }, [data]);

  const liquidityWarning = data && data.totals.net < 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Flow Forecast"
        description="Projected inflows (EMIs, recurring deposits) vs. outflows (term deposit maturities) over the next 30 / 60 / 90 days."
      >
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={horizon} onValueChange={setHorizon}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZON_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={14} className={cn('mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {liquidityWarning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30">
          <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Projected net cash position is negative
            </p>
            <p className="text-amber-800 dark:text-amber-300/80">
              Outflows exceed inflows over the next {data.horizonDays} days. Consider deferring new disbursements or pre-funding upcoming maturities.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Projected Inflows"
          value={formatCurrency(data?.totals?.inflow || 0)}
          hint={`EMIs ${formatCurrency(data?.breakdown?.emiInflow || 0)} · Scheduled ${formatCurrency(data?.breakdown?.scheduledInflow || 0)}`}
          icon={ArrowDownCircle}
          tone="inflow"
        />
        <StatCard
          label="Projected Outflows"
          value={formatCurrency(data?.totals?.outflow || 0)}
          hint={`TD maturities ${formatCurrency(data?.breakdown?.tdOutflow || 0)}`}
          icon={ArrowUpCircle}
          tone="outflow"
        />
        <StatCard
          label="Net Position"
          value={formatCurrency(data?.totals?.net || 0)}
          hint={liquidityWarning ? 'Shortfall — review liquidity' : 'Surplus'}
          icon={TrendingUp}
          tone={liquidityWarning ? 'warning' : 'inflow'}
        />
      </div>

      <Card className="border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap pb-3">
          <div>
            <CardTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
              {view === 'bucketed' ? (
                <BarChart3 size={16} className="text-primary" />
              ) : (
                <Activity size={16} className="text-primary" />
              )}
              {view === 'bucketed'
                ? 'Inflow vs Outflow per Bucket'
                : 'Projected Cash Position'}
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {view === 'bucketed'
                ? 'Green above the axis is money in. Red below the axis is money out. The line is the bucket net.'
                : 'Running net cash position from today out to the end of the horizon.'}
            </p>
          </div>
          <div className="inline-flex rounded-full p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <ViewTab active={view === 'bucketed'} onClick={() => setView('bucketed')}>
              Bucketed
            </ViewTab>
            <ViewTab active={view === 'cumulative'} onClick={() => setView('cumulative')}>
              Cumulative
            </ViewTab>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {bucketedChartData.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No forecast data"
              description="No upcoming cash events were found for this horizon."
            />
          ) : view === 'bucketed' ? (
            <div className="h-[360px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={bucketedChartData}
                  margin={{ top: 16, right: 12, left: 4, bottom: 0 }}
                  onClick={(state) => {
                    if (state?.activeLabel) {
                      setActiveBucket(state.activeLabel);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="cf-inflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
                    </linearGradient>
                    <linearGradient id="cf-outflow" x1="0" y1="1" x2="0" y2="0">
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
                    dataKey="shortName"
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
                    tickFormatter={(v) => formatCompactValue(Math.abs(v))}
                    width={56}
                    className="font-bold opacity-50"
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground)/0.4)" />
                  <ReTooltip
                    content={<CashFlowTooltip mode="bucketed" />}
                    cursor={{ fill: 'hsl(var(--primary)/0.06)' }}
                    animationDuration={150}
                  />
                  <Bar
                    dataKey="inflow"
                    name="Inflow"
                    fill="url(#cf-inflow)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={42}
                    animationDuration={900}
                  />
                  <Bar
                    dataKey="outflowNeg"
                    name="Outflow"
                    fill="url(#cf-outflow)"
                    radius={[0, 0, 10, 10]}
                    maxBarSize={42}
                    animationDuration={900}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Bucket net"
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
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[360px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={cumulativeChartData}
                  margin={{ top: 16, right: 12, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cf-pos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="cf-neg" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--muted-foreground)/0.15)"
                  />
                  <XAxis
                    dataKey="shortName"
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
                    tickFormatter={(v) => formatCompactValue(v)}
                    width={56}
                    className="font-bold opacity-50"
                  />
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--muted-foreground)/0.5)"
                    strokeDasharray="4 4"
                  />
                  <ReTooltip
                    content={<CashFlowTooltip mode="cumulative" />}
                    cursor={{
                      stroke: 'hsl(var(--primary))',
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    }}
                    animationDuration={150}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fill={liquidityWarning ? 'url(#cf-neg)' : 'url(#cf-pos)'}
                    activeDot={{
                      r: 6,
                      strokeWidth: 3,
                      stroke: 'hsl(var(--background))',
                      fill: 'hsl(var(--primary))',
                    }}
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {view === 'bucketed' && activeBucket && (
            <ActiveBucketCard
              bucket={bucketedChartData.find((b) => b.name === activeBucket)}
              onClear={() => setActiveBucket(null)}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventList
          title="Largest Inflows"
          tone="inflow"
          events={data?.upcoming?.largestInflows || []}
        />
        <EventList
          title="Largest Outflows"
          tone="outflow"
          events={data?.upcoming?.largestOutflows || []}
        />
      </div>
    </div>
  );
};

const ViewTab = ({ active, onClick, children }) => (
  <Button
    type="button"
    variant="ghost"
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all',
      active
        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
    )}
  >
    {children}
  </Button>
);

const CashFlowTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="bg-background/95 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5 min-w-[200px]">
      <p className="text-[10px] font-black text-muted-foreground mb-3 uppercase tracking-[0.2em] border-b border-border/50 pb-2">
        {row.name || label}
      </p>
      {mode === 'bucketed' ? (
        <div className="space-y-2.5">
          <TooltipRow label="Inflow" value={row.inflow} colorClass="text-emerald-500" dotColor="#10b981" />
          <TooltipRow label="Outflow" value={row.outflow} colorClass="text-rose-500" dotColor="#f43f5e" />
          <div className="pt-2 mt-1 border-t border-border/50">
            <TooltipRow
              label="Net"
              value={row.net}
              colorClass={row.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              dotColor={row.net >= 0 ? '#10b981' : '#f43f5e'}
              bold
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <TooltipRow
            label="Projected balance"
            value={row.balance}
            colorClass={row.balance >= 0 ? 'text-primary' : 'text-rose-500'}
            dotColor={row.balance >= 0 ? 'hsl(var(--primary))' : '#f43f5e'}
            bold
          />
          {row.inflow != null && (
            <TooltipRow label="Inflow this bucket" value={row.inflow} colorClass="text-emerald-500" dotColor="#10b981" />
          )}
          {row.outflow != null && (
            <TooltipRow label="Outflow this bucket" value={row.outflow} colorClass="text-rose-500" dotColor="#f43f5e" />
          )}
        </div>
      )}
    </div>
  );
};

const TooltipRow = ({ label, value, colorClass, dotColor, bold }) => (
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

const ActiveBucketCard = ({ bucket, onClear }) => {
  if (!bucket) return null;
  const positive = bucket.net >= 0;
  return (
    <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Focus
          </p>
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
            {bucket.name}
            <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {formatDate(bucket.startDate)} – {formatDate(bucket.endDate)}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onClear}
          className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          Clear
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <BucketStat label="Inflow" value={bucket.inflow} color="text-emerald-600 dark:text-emerald-400" />
        <BucketStat label="Outflow" value={bucket.outflow} color="text-rose-600 dark:text-rose-400" />
        <BucketStat
          label="Net"
          value={bucket.net}
          color={positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
        />
      </div>
    </div>
  );
};

const BucketStat = ({ label, value, color }) => (
  <div className="rounded-xl bg-background/70 border border-border/40 px-3 py-2">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
      {label}
    </p>
    <p className={cn('mt-0.5 text-base font-extrabold tabular-nums', color)}>
      {formatCurrency(value || 0)}
    </p>
  </div>
);

const EventList = ({ title, events, tone }) => (
  <Card className="border-slate-100 dark:border-white/[0.06]">
    <CardHeader>
      <CardTitle className="text-base font-extrabold tracking-tight">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {events.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
          No upcoming events.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.01]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {e.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Due {formatDate(e.dueDate)}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  'shrink-0 font-extrabold',
                  tone === 'inflow'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
                )}
              >
                {formatCurrency(e.amount)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export default CashFlowForecast;
