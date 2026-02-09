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
import { History } from 'lucide-react';
import { formatPKR, formatCompactValue } from '@/lib/utils';

const AnalyticsChart = ({ data = [] }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-md border border-border p-3 rounded-lg">
          <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
            {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  {entry.name}:
                </span>
                <span
                  className={`text-xs font-black ${entry.name === 'actual' ? 'text-primary' : 'text-primary/70'}`}
                >
                  {formatPKR(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = data;

  return (
    <Card className="col-span-2 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
      <CardHeader className="pb-2 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black tracking-tight">
              Cash Flow Analysis
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
              6-Month History & 6-Month Projection
            </CardDescription>
          </div>
          <div className="bg-primary/5 p-2 rounded-xl">
            <History className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[250px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--muted-foreground)/0.2)"
              />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactValue(value)}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: 'hsl(var(--primary))',
                }}
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="hsl(var(--primary)/0.5)"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 0,
                  fill: 'hsl(var(--primary)/0.8)',
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
export default AnalyticsChart;
