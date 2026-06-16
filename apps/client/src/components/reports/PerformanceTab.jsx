import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Users,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
import {
  formatFullCurrency as formatCurrency,
  formatCurrency as formatCompactCurrency,
  formatCompactValue,
  cn,
} from '@/lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/80 backdrop-blur-md border border-border p-3 rounded-lg">
        <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xs font-bold text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceTab = () => {
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
  const [portfolioOverview, setPortfolioOverview] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const { data: reportData } = await api.get('/reports/stats');
        setData(reportData.charts);
        setSummary(reportData.summary);
        if (reportData.portfolioOverview) {
          setPortfolioOverview(reportData.portfolioOverview);
        }
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      {loading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Volume"
            amount={formatCompactCurrency(summary.totalVolume)}
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

      {/* Portfolio Overview Section */}
      {loading ? (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card
              key={i}
              className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden"
            >
              <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36 rounded-lg" />
                    <Skeleton className="h-3 w-48 rounded-lg" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-9 w-16 rounded-lg" />
                  <Skeleton className="h-3 w-24 rounded-lg" />
                </div>
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : portfolioOverview ? (
        <div className="space-y-5">
          {/* Branch Selector */}
          {portfolioOverview.branchBreakdown?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                onClick={() => setSelectedBranch('all')}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                  selectedBranch === 'all'
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 hover:bg-primary hover:text-white'
                    : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary',
                )}
              >
                <Building2 size={12} className="inline mr-1.5 -mt-0.5" />
                All Branches
              </Button>
              {portfolioOverview.branchBreakdown.map((b) => (
                <Button
                  key={b.branchId}
                  variant="ghost"
                  onClick={() => setSelectedBranch(b.branchId)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                    selectedBranch === b.branchId
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 hover:bg-primary hover:text-white'
                      : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary',
                  )}
                >
                  {b.branchName}
                </Button>
              ))}
            </div>
          )}

          {(() => {
            // Resolve data for the selected branch
            const branchData =
              selectedBranch === 'all'
                ? portfolioOverview
                : portfolioOverview.branchBreakdown?.find(
                    (b) => b.branchId === selectedBranch,
                  ) || portfolioOverview;

            return (
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                {/* Member Overview Card */}
                <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
                  <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-black tracking-tight">
                          Member Overview
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                          {selectedBranch === 'all'
                            ? 'Total member base breakdown'
                            : `${branchData.branchName || 'Branch'} members`}
                        </CardDescription>
                      </div>
                      <div className="bg-primary/5 p-2.5 rounded-xl">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black tracking-tighter">
                        {branchData.members.total}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Total Members
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold">Active</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">
                          {branchData.members.active}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-500/5 border border-slate-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-xs font-bold">
                            Inactive
                          </span>
                        </div>
                        <span className="text-sm font-black text-slate-500">
                          {branchData.members.inactive}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-xs font-bold">
                            Defaulters
                          </span>
                        </div>
                        <span className="text-sm font-black text-rose-600">
                          {branchData.members.defaulters}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Breakdown Card */}
                <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
                  <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-black tracking-tight">
                          Loan Portfolio
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                          {selectedBranch === 'all'
                            ? 'Status breakdown of all loans'
                            : `${branchData.branchName || 'Branch'} loans`}
                        </CardDescription>
                      </div>
                      <div className="bg-indigo-500/5 p-2.5 rounded-xl">
                        <FileText className="w-5 h-5 text-indigo-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black tracking-tighter">
                        {branchData.loans.total}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Total Loans
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold">Active</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-600">
                            {branchData.loans.active}
                          </span>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            {formatCurrency(
                              branchData.loans.activeLoanAmount,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold">Overdue</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-amber-600">
                            {branchData.loans.overdue}
                          </span>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            {formatCurrency(branchData.loans.overdueAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-xs font-bold">
                            Defaulted
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-rose-600">
                            {branchData.loans.defaulted}
                          </span>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            {formatCurrency(
                              branchData.loans.defaultedAmount,
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold">
                            Completed
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-blue-600">
                            {branchData.loans.completed}
                          </span>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            {formatCurrency(
                              branchData.loans.completedAmount,
                            )}
                          </p>
                        </div>
                      </div>
                      {branchData.loans.pending > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-xs font-bold">
                              Pending
                            </span>
                          </div>
                          <span className="text-sm font-black text-purple-600">
                            {branchData.loans.pending}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Health Card */}
                <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
                  <CardHeader className="p-4 sm:p-6 pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-black tracking-tight">
                          Financial Health
                        </CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                          {selectedBranch === 'all'
                            ? 'Key financial indicators'
                            : `${branchData.branchName || 'Branch'} financials`}
                        </CardDescription>
                      </div>
                      <div className="bg-emerald-500/5 p-2.5 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/70 mb-1">
                          Total Outstanding
                        </p>
                        <p className="text-2xl font-black tracking-tight text-primary">
                          {formatCurrency(
                            branchData.financials.totalOutstanding,
                          )}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70 mb-1">
                          Total Recovered
                        </p>
                        <p className="text-2xl font-black tracking-tight text-emerald-600">
                          {formatCurrency(
                            branchData.financials.totalRepaid,
                          )}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-600/70 mb-1">
                          Late Fees Accrued
                        </p>
                        <p className="text-xl font-black tracking-tight text-rose-600">
                          {formatCurrency(
                            branchData.financials.totalLateFees,
                          )}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70 mb-1">
                          Active Outstanding
                        </p>
                        <p className="text-xl font-black tracking-tight text-amber-600">
                          {formatCurrency(
                            branchData.loans.activeOutstanding,
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </div>
      ) : null}

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
  );
};

export default PerformanceTab;
