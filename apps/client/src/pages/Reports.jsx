import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Download, DollarSign, TrendingUp, Users } from 'lucide-react'; // Imports merged
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import ChartSkeleton from '@/components/ChartSkeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import api from '@/lib/axios';
import { formatPKR, formatCompactValue } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Reports = () => {
  const [data, setData] = useState({
    monthlyLoans: [],
    monthlyRepayments: [],
  });
  const [summary, setSummary] = useState({
    totalVolume: 0,
    totalVolumeChange: '0%',
    avgInterest: 0,
    avgInterestChange: '0%',
    collectionRate: 0,
    collectionRateChange: '0%',
    growth: 0,
    growthChange: '0%',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const { data: reportData } = await api.get('/reports/stats');
        setData(reportData.charts);
        setSummary(reportData.summary);
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  const handleExport = () => {
    // Mock export functionality
    const csvContent =
      'data:text/csv;charset=utf-8,Month,Value\n' +
      data.monthlyLoans.map((e) => `${e.name},${e.value}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'loan_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/80 backdrop-blur-md border border-border p-3 rounded-lg">
          <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xs font-bold text-primary">
            {formatPKR(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Insight & Analytics"
        description="Deep dive into your lending performance and trends."
      >
        <Button
          onClick={handleExport}
          variant="gradient"
          className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
        >
          <Download size={16} strokeWidth={3} />
          Export Insights
        </Button>
      </PageHeader>

      {loading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Volume"
            amount={formatPKR(summary.totalVolume)}
            percentage={parseFloat(summary.totalVolumeChange)}
            icon={<DollarSign size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Avg Interest"
            amount={`${summary.avgInterest}%`}
            percentage={parseFloat(summary.avgInterestChange)}
            icon={<TrendingUp size={20} />}
            color="bg-orange-500 shadow-orange-500/20"
          />
          <StatsCard
            title="Collection Rate"
            amount={`${summary.collectionRate}%`}
            percentage={parseFloat(summary.collectionRateChange)}
            icon={<TrendingUp size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Revenue Growth"
            amount={summary.growth}
            percentage={parseFloat(summary.growthChange)}
            icon={<TrendingUp size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
          <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Loan Distribution
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Monthly volume of new loan originations
                </CardDescription>
              </div>
              <div className="bg-primary/5 p-2 rounded-xl">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyLoans}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted/50"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => formatCompactValue(value)}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
          <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black tracking-tight">
                  Repayment Velocity
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                  Consistency of collection across months
                </CardDescription>
              </div>
              <div className="bg-emerald-500/5 p-2 rounded-xl">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full pt-4">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyRepayments}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted/50"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => formatCompactValue(value)}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                      animationDuration={2000}
                    >
                      {data.monthlyRepayments.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fillOpacity={
                            0.7 + (index / data.monthlyRepayments.length) * 0.3
                          }
                        />
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

export default Reports;
