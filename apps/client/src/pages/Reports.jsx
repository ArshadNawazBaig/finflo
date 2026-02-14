import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Download,
  DollarSign,
  TrendingUp,
  FileText,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import ChartSkeleton from '@/components/ChartSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
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
  PieChart,
  Pie,
} from 'recharts';
import api from '@/lib/axios';
import { formatPKR, formatCompactValue, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('performance');
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

  // Regulatory State
  const [ifrs9Data, setIfrs9Data] = useState(null);
  const [basel3Data, setBasel3Data] = useState(null);
  const [regulatoryLoading, setRegulatoryLoading] = useState(false);

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
    const csvContent =
      'data:text/csv;charset=utf-8,Month,Value\n' +
      data.monthlyLoans.map((e) => `${e.name},${e.value}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'loan_performance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateIFRS9 = async () => {
    try {
      setRegulatoryLoading(true);
      const { data } = await api.get('/reports/ifrs9');
      setIfrs9Data(data);
      toast.success('IFRS 9 Report Generated');
    } catch (error) {
      toast.error('Failed to generate IFRS 9 Report');
    } finally {
      setRegulatoryLoading(false);
    }
  };

  const generateBasel3 = async () => {
    try {
      setRegulatoryLoading(true);
      const { data } = await api.get('/reports/basel3');
      setBasel3Data(data);
      toast.success('Basel III Report Generated');
    } catch (error) {
      toast.error('Failed to generate Basel III Report');
    } finally {
      setRegulatoryLoading(false);
    }
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
        title={
          <>
            Insight & <span className="text-primary ">Analytics</span>
          </>
        }
        description="Deep dive into your lending performance and regulatory compliance."
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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('performance')}
          className={cn(
            'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
            activeTab === 'performance'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Activity size={14} />
          Performance
        </button>
        <button
          onClick={() => setActiveTab('regulatory')}
          className={cn(
            'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
            activeTab === 'regulatory'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ShieldCheck size={14} />
          Regulatory Center
        </button>
      </div>

      {activeTab === 'performance' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
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
                          cursor={{
                            stroke: 'hsl(var(--primary))',
                            strokeWidth: 1,
                          }}
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
                                0.7 +
                                (index / data.monthlyRepayments.length) * 0.3
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
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          {/* IFRS 9 Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="p-8 pb-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-1.5 mb-3 w-fit">
                      <FileText size={10} />
                      Risk Standard
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight">
                      IFRS 9 Reporting
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-muted-foreground mt-1.5">
                      Calculate Expected Credit Loss (ECL) based on Probability
                      of Default (PD) and Loss Given Default (LGD).
                    </CardDescription>
                  </div>
                  <Button
                    onClick={generateIFRS9}
                    disabled={regulatoryLoading}
                    className="rounded-full h-12 w-12 p-0 bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/20"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 relative space-y-6">
                {regulatoryLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-20 rounded-2xl" />
                      <Skeleton className="h-20 rounded-2xl" />
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24 rounded" />
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-14 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ) : ifrs9Data ? (
                  <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-1">
                          Total Exposure
                        </div>
                        <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                          {formatPKR(ifrs9Data.meta.totalExposure)}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-rose-500/70 mb-1">
                          Expected Credit Loss
                        </div>
                        <div className="text-lg font-black text-rose-600">
                          {formatPKR(ifrs9Data.meta.totalECL)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                        Risk Breakdown
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(ifrs9Data.gradeBreakdown).map(
                          ([grade, metrics]) => (
                            <div
                              key={grade}
                              className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-background shadow-sm border border-border/50 flex items-center justify-center text-xs font-black">
                                  {grade}
                                </span>
                                <div>
                                  <div className="text-xs font-bold">
                                    {metrics.count} Application(s)
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    Exp: {formatCompactValue(metrics.exposure)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-rose-500">
                                  {formatCompactValue(metrics.ecl)}
                                </div>
                                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                  ECL
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                    <FileText size={48} strokeWidth={1} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      No Report Generated
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Basel III Section */}
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="p-8 pb-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-1.5 mb-3 w-fit">
                      <Landmark size={10} />
                      Capital Logic
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight">
                      Basel III Adequacy
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-muted-foreground mt-1.5">
                      Assess capital adequacy ratios (CAR) and risk-weighted
                      assets (RWA) compliance.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={generateBasel3}
                    disabled={regulatoryLoading}
                    className="rounded-full h-12 w-12 p-0 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 relative space-y-6">
                {regulatoryLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <Skeleton className="h-32 rounded-[1.5rem]" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-5 w-24 rounded" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-5 w-24 rounded" />
                      </div>
                    </div>
                  </div>
                ) : basel3Data ? (
                  <div className="space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="p-5 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                          Capital Adequacy Ratio
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">
                          {basel3Data.ratios.status}
                        </span>
                      </div>
                      <div className="text-4xl font-black tracking-tighter">
                        {basel3Data.ratios.capitalAdequacyRatio.toFixed(2)}%
                      </div>
                      <div className="mt-2 h-2 bg-emerald-500/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              basel3Data.ratios.capitalAdequacyRatio,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Risk Weighted Assets
                        </div>
                        <div className="text-sm font-black">
                          {formatCompactValue(basel3Data.assets.totalRWA)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Tier 1 Capital
                        </div>
                        <div className="text-sm font-black text-emerald-600">
                          {formatCompactValue(basel3Data.capital.tier1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                    <Landmark size={48} strokeWidth={1} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      No Report Generated
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
