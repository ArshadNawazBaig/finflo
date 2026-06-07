import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Download, TrendingUp, BarChart3, Activity, CalendarRange } from 'lucide-react';
import { formatCurrency, formatCompactValue, cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';

// Inflow vs Outflow per month — mirrors the "Inflow vs Outflow per Bucket"
// chart on the Cash Flow Forecast page. Two views, toggleable:
//   Bucketed   — money in stays positive (green, above the axis), money out is
//                mirrored below zero (red), and the monthly net line slices
//                through. Reads like a price chart.
//   Cumulative — the running net cash position month over month.
//
// Money in  = repayments (`inflow`) + deposits + capital injected + projected
// Money out = disbursements (`outflow`) + withdrawals + expenses + capital withdrawn
// `profit` is the interest portion of repayments (a subset of `inflow`) so it is
// deliberately excluded to avoid double counting.
const buildChartData = (data) =>
  data.map((d) => {
    const capitalIn = d.capital > 0 ? d.capital : 0;
    const capitalOut = d.capital < 0 ? -d.capital : 0;
    const inflow =
      (d.inflow || 0) + (d.deposits || 0) + (d.projected || 0) + capitalIn;
    const outflow =
      (d.outflow || 0) + (d.withdrawals || 0) + (d.expenses || 0) + capitalOut;
    return {
      ...d,
      inflowTotal: inflow,
      outflowTotal: outflow,
      outflowNeg: -outflow, // mirror below the axis
      net: inflow - outflow,
    };
  });

const ViewTab = ({ active, onClick, children }) => (
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

const ChartTooltip = ({ active, payload, label, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload || {};
  const rows =
    mode === 'cumulative'
      ? [{ key: 'balance', label: 'Net Position', value: row.balance, color: 'hsl(var(--primary))' }]
      : [
          { key: 'inflow', label: 'Inflow', value: row.inflowTotal, color: '#10b981' },
          { key: 'outflow', label: 'Outflow', value: row.outflowTotal, color: '#f43f5e' },
          { key: 'net', label: 'Net', value: row.net, color: 'hsl(var(--primary))' },
        ];
  return (
    <div className="bg-background/95 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5 min-w-[200px]">
      <p className="text-[10px] font-black text-muted-foreground mb-3 uppercase tracking-[0.2em] border-b border-border/50 pb-2">
        {label}
      </p>
      <div className="space-y-2.5">
        {rows.map((entry) => (
          <div key={entry.key} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-wider">
                {entry.label}:
              </span>
            </div>
            <span
              className={cn(
                'text-xs font-black tabular-nums',
                (entry.key === 'net' || entry.key === 'balance') &&
                  (entry.value < 0 ? 'text-rose-500' : 'text-emerald-500'),
              )}
              style={
                entry.key !== 'net' && entry.key !== 'balance'
                  ? { color: entry.color }
                  : undefined
              }
            >
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsChart = ({
  data = [],
  dateRange,
  setDateRange,
  onDownload,
  isDownloading,
  className,
}) => {
  const [view, setView] = useState('bucketed'); // 'bucketed' | 'cumulative'

  const chartData = useMemo(() => buildChartData(data), [data]);

  // Cumulative view: running net cash position month over month.
  const cumulativeData = useMemo(() => {
    let running = 0;
    return chartData.map((d) => {
      running += d.net;
      return { name: d.name, balance: running };
    });
  }, [chartData]);

  const hasData = chartData.length > 0;
  const endsNegative =
    cumulativeData.length > 0 &&
    cumulativeData[cumulativeData.length - 1].balance < 0;

  return (
    <Card
      className={cn(
        'col-span-2 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]',
        className,
      )}
    >
      <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-lg font-black tracking-tight">
                Cash Flow Analysis
              </CardTitle>
            </div>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {dateRange?.from && dateRange?.to
                ? `Activity from ${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
                : '6-Month History & 6-Month Projection'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-2xl border-white/10 bg-white/5 backdrop-blur-xl h-12 w-12 transition-all duration-500 hover:bg-white/10 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] group overflow-hidden"
              onClick={onDownload}
              isLoading={isDownloading}
              title="Download Statement (PDF)"
            >
              <Download className="relative w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        {/* View descriptor + toggle */}
        <div className="flex flex-row items-start justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            {view === 'bucketed' ? (
              <BarChart3 size={16} className="text-primary" />
            ) : (
              <Activity size={16} className="text-primary" />
            )}
            <p className="text-xs text-muted-foreground">
              {view === 'bucketed'
                ? 'Green above the axis is money in. Red below is money out. The line is the monthly net.'
                : 'Running net cash position across the period.'}
            </p>
          </div>
          <div className="inline-flex rounded-full p-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
            <ViewTab active={view === 'bucketed'} onClick={() => setView('bucketed')}>
              Bucketed
            </ViewTab>
            <ViewTab
              active={view === 'cumulative'}
              onClick={() => setView('cumulative')}
            >
              Cumulative
            </ViewTab>
          </div>
        </div>

        {!hasData ? (
          <EmptyState
            icon={CalendarRange}
            title="No cash flow data"
            description="No inflows or outflows were recorded for this period."
          />
        ) : view === 'bucketed' ? (
          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 16, left: 8, right: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="analytics-inflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="analytics-outflow" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--muted-foreground)/0.1)"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  className="font-bold uppercase tracking-widest opacity-50"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value) => formatCompactValue(Math.abs(value))}
                  className="font-bold opacity-50"
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground)/0.4)" />
                <Tooltip
                  content={<ChartTooltip mode="bucketed" />}
                  cursor={{ fill: 'hsl(var(--primary)/0.06)' }}
                  animationDuration={150}
                />
                <Bar
                  dataKey="inflowTotal"
                  name="Inflow"
                  fill="url(#analytics-inflow)"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={32}
                  animationDuration={900}
                />
                <Bar
                  dataKey="outflowNeg"
                  name="Outflow"
                  fill="url(#analytics-outflow)"
                  radius={[0, 0, 10, 10]}
                  maxBarSize={32}
                  animationDuration={900}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
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
          <div className="h-[300px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cumulativeData}
                margin={{ top: 16, left: 8, right: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="analytics-pos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="analytics-neg" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--muted-foreground)/0.1)"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  className="font-bold uppercase tracking-widest opacity-50"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value) => formatCompactValue(value)}
                  className="font-bold opacity-50"
                />
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground)/0.5)"
                  strokeDasharray="4 4"
                />
                <Tooltip
                  content={<ChartTooltip mode="cumulative" />}
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
                  fill={endsNegative ? 'url(#analytics-neg)' : 'url(#analytics-pos)'}
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
      </CardContent>
    </Card>
  );
};
export default AnalyticsChart;
