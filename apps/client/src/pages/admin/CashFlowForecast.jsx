import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '@/lib/axios';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
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

  const chartData = useMemo(() => {
    if (!data?.buckets) return [];
    return data.buckets.map((b) => ({
      name: b.label,
      Inflow: b.inflow,
      Outflow: b.outflow,
      Net: b.net,
    }));
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

      <Card className="border-slate-100 dark:border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-base font-extrabold tracking-tight">
            Bucketed Inflow vs Outflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState
              title="No forecast data"
              description="No upcoming cash events were found for this horizon."
            />
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-white/5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                  <ReTooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Inflow" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Outflow" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
