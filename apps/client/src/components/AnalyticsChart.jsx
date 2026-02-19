import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Download, TrendingUp } from 'lucide-react';
import { formatPKR, formatCompactValue } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';

const AnalyticsChart = ({
  data = [],
  dateRange,
  setDateRange,
  onDownload,
  loading,
}) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 p-4 rounded-2xl shadow-2xl ring-1 ring-black/5">
          <p className="text-[10px] font-black text-muted-foreground mb-3 uppercase tracking-[0.2em] border-b border-border/50 pb-2">
            {label}
          </p>
          <div className="space-y-2.5">
            {payload.map((entry, index) => {
              const colors = {
                inflow: 'text-primary',
                deposits: 'text-blue-500',
                expenses: 'text-rose-500',
                outflow: 'text-orange-500',
                profit: 'text-emerald-500',
                projected: 'text-primary/60',
              };
              const labels = {
                inflow: 'Inflow',
                deposits: 'Deposits',
                expenses: 'Operating Expenses',
                outflow: 'Disbursements',
                profit: 'Interest Profit',
                projected: 'Projected Inflow',
              };

              // Show all active data points even if zero
              if (entry.value === undefined || entry.value === null)
                return null;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-8 group"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${entry.color.replace('hsl', 'bg-[hsl').replace(')', ')]')}`}
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-[10px] uppercase font-black text-muted-foreground/70 tracking-wider">
                      {labels[entry.dataKey] || entry.name}:
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black tabular-nums ${colors[entry.dataKey] || 'text-foreground'}`}
                  >
                    {formatPKR(entry.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = data;

  return (
    <Card className="col-span-2 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
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
              disabled={loading}
              title="Download Statement (PDF)"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/0 via-primary/5 to-primary/0 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000" />
              <Download className="relative w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[300px] w-full pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ left: 20, right: 20, bottom: 0 }}
            >
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
                tickFormatter={(value) => formatCompactValue(value)}
                className="font-bold opacity-50"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: 'hsl(var(--primary))',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />
              <Line
                type="monotone"
                dataKey="inflow"
                name="Inflow"
                stroke="hsl(var(--primary))"
                strokeWidth={4}
                dot={false}
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: 'hsl(var(--primary))',
                }}
                animationDuration={1500}
              />
              <Line
                type="monotone"
                dataKey="deposits"
                name="Deposits"
                stroke="#3b82f6" // blue-500
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#3b82f6' }}
                animationDuration={1500}
                opacity={0.9}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f43f5e" // rose-500
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#f43f5e' }}
                animationDuration={1500}
                opacity={0.85}
              />
              <Line
                type="monotone"
                dataKey="outflow"
                name="Disbursements"
                stroke="#f97316" // orange-500
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#f97316' }}
                animationDuration={1500}
                opacity={0.9}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#10b981" // emerald-500
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                animationDuration={1500}
                opacity={0.9}
              />
              <Line
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="hsl(var(--primary))"
                strokeDasharray="8 4"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 0,
                  fill: 'hsl(var(--primary)/0.6)',
                }}
                opacity={0.4}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
export default AnalyticsChart;
