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
  Landmark,
  Layers,
  TrendingDown,
  ArrowRightLeft,
  Banknote,
  Save,
  Clock,
  Eye,
  Loader2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import autoTable from 'jspdf-autotable';
import StatsCard from '@/components/StatsCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
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
} from 'recharts';
import api from '@/lib/axios';
import { formatCurrency, formatCompactValue, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';

const Reports = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = ['admin', 'super_admin'].includes(user.role);

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
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  // Advanced Reporting State
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [loadingPnL, setLoadingPnL] = useState(false);
  const [trialBalance, setTrialBalance] = useState(null);
  const [pnl, setPnL] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [isExporting, setIsExporting] = useState(false);

  // Branch Analytics
  const [branchSummaries, setBranchSummaries] = useState(null);
  const [loadingBranch, setLoadingBranch] = useState(false);

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

  useEffect(() => {
    // Initial sync of dateRange to API parameters if needed
  }, []);

  const fetchTrialBalance = async () => {
    try {
      setLoadingTrial(true);
      const { data: tbData } = await api.get('/reports/trial-balance');
      setTrialBalance(tbData);
    } catch (error) {
      toast.error('Failed to fetch Trial Balance');
    } finally {
      setLoadingTrial(false);
    }
  };

  const fetchPnL = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    try {
      setLoadingPnL(true);
      const sDate = format(dateRange.from, 'yyyy-MM-dd');
      const eDate = format(dateRange.to, 'yyyy-MM-dd');
      const { data: pnlData } = await api.get(
        `/reports/profit-loss?startDate=${sDate}&endDate=${eDate}`,
      );
      setPnL(pnlData);
    } catch (error) {
      toast.error('Failed to fetch Profit & Loss report');
    } finally {
      setLoadingPnL(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'trial-balance' && !trialBalance) {
      fetchTrialBalance();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'profit-loss' && dateRange?.from && dateRange?.to) {
      fetchPnL();
    }
  }, [activeTab, dateRange]);

  useEffect(() => {
    if (activeTab === 'branch-analytics' && !branchSummaries) {
      fetchBranchSummaries();
    }
  }, [activeTab]);

  const exportAdvancedPDF = (type) => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('FINFLO PORTAL', 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.line(14, 35, pageWidth - 14, 35);

      if (type === 'trial' && trialBalance) {
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Trial Balance Statement', 14, 45);
        doc.setFontSize(10);
        doc.text('As of Current Date', 14, 52);

        const tableData = [
          [
            {
              content: 'ASSETS',
              colSpan: 2,
              styles: {
                fillColor: [243, 244, 246],
                fontStyle: 'bold',
                textColor: 0,
              },
            },
          ],
          [
            'Loans Receivable',
            formatCurrency(trialBalance.assets?.loansReceivable || 0),
          ],
          [
            'Cash at Hand / Bank',
            formatCurrency(trialBalance.assets?.cashAtHand || 0),
          ],
          [
            { content: 'Total Assets', styles: { fontStyle: 'bold' } },
            {
              content: formatCurrency(trialBalance.assets?.totalAssets || 0),
              styles: { fontStyle: 'bold' },
            },
          ],

          [
            {
              content: 'LIABILITIES',
              colSpan: 2,
              styles: {
                fillColor: [243, 244, 246],
                fontStyle: 'bold',
                textColor: 0,
              },
            },
          ],
          [
            'Member Capital',
            formatCurrency(trialBalance.liabilities?.memberCapital || 0),
          ],
          [
            { content: 'Total Liabilities', styles: { fontStyle: 'bold' } },
            {
              content: formatCurrency(
                trialBalance.liabilities?.totalLiabilities || 0,
              ),
              styles: { fontStyle: 'bold' },
            },
          ],

          [
            {
              content: 'EQUITY',
              colSpan: 2,
              styles: {
                fillColor: [243, 244, 246],
                fontStyle: 'bold',
                textColor: 0,
              },
            },
          ],
          [
            'Retained Earnings',
            formatCurrency(trialBalance.equity?.retainedEarnings || 0),
          ],
          [
            { content: 'Total Equity', styles: { fontStyle: 'bold' } },
            {
              content: formatCurrency(trialBalance.equity?.totalEquity || 0),
              styles: { fontStyle: 'bold' },
            },
          ],
        ];

        autoTable(doc, {
          startY: 60,
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right' } },
        });
      } else if (type === 'pnl' && pnl) {
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text('Profit & Loss Statement', 14, 45);
        doc.setFontSize(10);
        doc.text(
          `Period: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`,
          14,
          52,
        );

        const expensesList = Object.entries(pnl.expenses?.breakdown || {}).map(
          ([key, val]) => [
            `   - ${key.charAt(0).toUpperCase() + key.slice(1)}`,
            formatCurrency(val),
          ],
        );

        const distributionsList = Object.entries(
          pnl.distributions?.breakdown || {},
        ).map(([key, val]) => [
          `   - ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          formatCurrency(val),
        ]);

        const tableData = [
          [
            {
              content: 'REVENUE',
              colSpan: 2,
              styles: {
                fillColor: [243, 244, 246],
                fontStyle: 'bold',
                textColor: 0,
              },
            },
          ],
          ['Interest Earned', formatCurrency(pnl.revenue?.interestEarned || 0)],
          [
            {
              content: 'Total Gross Revenue',
              styles: { fontStyle: 'bold', textColor: [16, 185, 129] },
            },
            {
              content: formatCurrency(pnl.revenue?.totalRevenue || 0),
              styles: { fontStyle: 'bold', textColor: [16, 185, 129] },
            },
          ],

          [
            {
              content: 'OPERATING EXPENSES',
              colSpan: 2,
              styles: {
                fillColor: [243, 244, 246],
                fontStyle: 'bold',
                textColor: 0,
              },
            },
          ],
          ...expensesList,
          [
            {
              content: 'Total Expenses',
              styles: { fontStyle: 'bold', textColor: [239, 68, 68] },
            },
            {
              content: formatCurrency(pnl.expenses?.totalExpenses || 0),
              styles: { fontStyle: 'bold', textColor: [239, 68, 68] },
            },
          ],

          [
            {
              content: 'DISTRIBUTIONS',
              colSpan: 2,
              styles: {
                fillColor: [243, 244, 246],
                fontStyle: 'bold',
                textColor: 0,
              },
            },
          ],
          ...distributionsList,
          [
            {
              content: 'Total Distributions',
              styles: { fontStyle: 'bold', textColor: [245, 158, 11] },
            },
            {
              content: formatCurrency(
                pnl.distributions?.totalDistributions || 0,
              ),
              styles: { fontStyle: 'bold', textColor: [245, 158, 11] },
            },
          ],

          [
            {
              content: 'NET INCOME',
              styles: {
                fontStyle: 'bold',
                fontSize: 12,
                fillColor: [16, 185, 129],
                textColor: 255,
              },
            },
            {
              content: formatCurrency(pnl.netIncome || 0),
              styles: {
                fontStyle: 'bold',
                fontSize: 12,
                fillColor: [16, 185, 129],
                textColor: 255,
              },
            },
          ],
        ];

        autoTable(doc, {
          startY: 60,
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right' } },
        });
      }

      doc.save(
        `${type === 'trial' ? 'Trial_Balance' : 'Profit_Loss'}_${new Date().toISOString().split('T')[0]}.pdf`,
      );
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

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

  const fetchSavedSnapshots = async () => {
    try {
      setLoadingSnapshots(true);
      const { data } = await api.get('/reports/snapshots');
      setSavedSnapshots(data);
    } catch (error) {
      toast.error('Failed to fetch saved snapshots');
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'regulatory') {
      fetchSavedSnapshots();
    }
  }, [activeTab]);

  const handleSaveSnapshot = async (type) => {
    try {
      setSavingSnapshot(true);
      const isIfrs9 = type === 'ifrs9';
      const dataToSave = isIfrs9 ? ifrs9Data : basel3Data;

      const defaultTitle = `${isIfrs9 ? 'IFRS 9' : 'Basel III'} Snapshot - ${new Date().toLocaleDateString()}`;
      const title = prompt(`Enter a title for this snapshot:`, defaultTitle);

      if (!title) return;

      await api.post('/reports/snapshots', {
        title,
        reportType: type,
        snapshotData: dataToSave,
        periodStart: dateRange?.from || new Date().toISOString(),
        periodEnd: dateRange?.to || new Date().toISOString(),
      });

      toast.success('Snapshot saved successfully');
      fetchSavedSnapshots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save snapshot');
    } finally {
      setSavingSnapshot(false);
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
            {formatCurrency(payload[0].value)}
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
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 pb-1 overflow-x-auto">
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
        <button
          onClick={() => setActiveTab('trial-balance')}
          className={cn(
            'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
            activeTab === 'trial-balance'
              ? 'border-emerald-500 text-emerald-500'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Layers size={14} />
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('profit-loss')}
          className={cn(
            'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
            activeTab === 'profit-loss'
              ? 'border-indigo-500 text-indigo-500'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <FileText size={14} />
          Profit & Loss
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('branch-analytics')}
            className={cn(
              'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
              activeTab === 'branch-analytics'
                ? 'border-purple-500 text-purple-500'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Banknote size={14} className="lucide-icon" />
            Branch Analytics
          </button>
        )}
      </div>

      {activeTab === 'branch-analytics' && isAdmin ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-2 border-b border-border/40">
              <CardTitle className="text-lg font-black tracking-tight">
                Cross-Branch Comparison
              </CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70 mt-1">
                Aggregated KPIs per branch
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingBranch ? (
                <div className="p-6">
                  <TableSkeleton rows={5} columns={8} />
                </div>
              ) : branchSummaries && branchSummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground font-black">
                      <tr>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4 text-center">Members</th>
                        <th className="px-6 py-4 text-right">Deposits</th>
                        <th className="px-6 py-4 text-center">Active Loans</th>
                        <th className="px-6 py-4 text-right">
                          Disbursed Volume
                        </th>
                        <th className="px-6 py-4 text-right">Outstanding</th>
                        <th className="px-6 py-4 text-right">Profit</th>
                        <th className="px-6 py-4 text-right">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {branchSummaries.map((branch) => (
                        <tr
                          key={branch._id}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold">
                            {branch.name}{' '}
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {branch.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium">
                            {branch.stats.totalMembers}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-blue-500">
                            {formatCurrency(branch.stats.totalInvested)}
                          </td>
                          <td className="px-6 py-4 text-center font-medium">
                            {branch.stats.activeLoans}{' '}
                            <span className="text-xs text-muted-foreground">
                              / {branch.stats.totalLoans}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-emerald-500">
                            {formatCurrency(branch.stats.totalVolume)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-amber-500">
                            {formatCurrency(branch.stats.totalOutstanding)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-indigo-500">
                            {formatCurrency(branch.stats.totalProfit)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-red-500">
                            {formatCurrency(branch.stats.totalExpenses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground min-h-[300px] flex items-center justify-center">
                  No branch analytics available. Ensure you have active branches
                  with data.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'performance' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          {loading ? (
            <CardsSkeleton />
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Volume"
                amount={formatCurrency(summary.totalVolume)}
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
      ) : activeTab === 'regulatory' ? (
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
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={generateIFRS9}
                      isLoading={regulatoryLoading}
                      title="Generate Report"
                      className="rounded-full h-12 w-12 p-0 bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/20"
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </Button>
                    {ifrs9Data && (
                      <Button
                        onClick={() => handleSaveSnapshot('ifrs9')}
                        isLoading={savingSnapshot}
                        variant="outline"
                        title="Save Snapshot"
                        className="rounded-full h-12 w-12 p-0 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                      >
                        <Save className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 relative space-y-6">
                {regulatoryLoading ? (
                  <div className="space-y-10">
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-24 rounded-[1.5rem]" />
                      <Skeleton className="h-24 rounded-[1.5rem]" />
                    </div>
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-32 rounded-full" />
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-16 rounded-2xl" />
                        ))}
                      </div>
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
                          {formatCurrency(ifrs9Data.meta.totalExposure)}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-rose-500/70 mb-1">
                          Expected Credit Loss
                        </div>
                        <div className="text-lg font-black text-rose-600">
                          {formatCurrency(ifrs9Data.meta.totalECL)}
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
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={generateBasel3}
                      isLoading={regulatoryLoading}
                      title="Generate Report"
                      className="rounded-full h-12 w-12 p-0 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </Button>
                    {basel3Data && (
                      <Button
                        onClick={() => handleSaveSnapshot('basel3')}
                        isLoading={savingSnapshot}
                        variant="outline"
                        title="Save Snapshot"
                        className="rounded-full h-12 w-12 p-0 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      >
                        <Save className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 relative space-y-6">
                {regulatoryLoading ? (
                  <div className="space-y-8">
                    <Skeleton className="h-40 rounded-[2rem]" />
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Skeleton className="h-3 w-24 rounded-full" />
                        <Skeleton className="h-8 w-32 rounded-xl" />
                      </div>
                      <div className="space-y-3">
                        <Skeleton className="h-3 w-24 rounded-full" />
                        <Skeleton className="h-8 w-32 rounded-xl" />
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

          <div className="mt-8">
            <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-6 sm:p-8 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">
                      Snapshot History
                    </CardTitle>
                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">
                      Previously saved regulatory reports
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingSnapshots ? (
                  <div className="p-12 flex justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : savedSnapshots.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/30 border-y border-border/50 text-[10px] uppercase tracking-widest font-black text-muted-foreground/70">
                        <tr>
                          <th className="px-6 sm:px-8 py-4">Title</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Generated By</th>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 sm:px-8 py-4 text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {savedSnapshots.map((snap) => (
                          <tr
                            key={snap._id}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <td className="px-6 sm:px-8 py-4 font-bold">
                              {snap.title}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  'px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold',
                                  snap.reportType === 'ifrs9'
                                    ? 'bg-indigo-500/10 text-indigo-500'
                                    : 'bg-emerald-500/10 text-emerald-500',
                                )}
                              >
                                {snap.reportType === 'ifrs9'
                                  ? 'IFRS 9'
                                  : 'Basel III'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium">
                              {snap.generatedBy?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {format(new Date(snap.createdAt), 'PPp')}
                            </td>
                            <td className="px-6 sm:px-8 py-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                                onClick={() => {
                                  if (snap.reportType === 'ifrs9')
                                    setIfrs9Data(snap.snapshotData);
                                  else setBasel3Data(snap.snapshotData);
                                  toast.success(`Loaded ${snap.title}`);
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1.5" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                    <Clock className="w-8 h-8 mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                      No Snapshots Saved
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : activeTab === 'trial-balance' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center bg-card p-6 rounded-3xl border border-border/50 shadow-sm">
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Layers className="text-emerald-500 w-5 h-5" /> Trial Balance
                Statement
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Snapshot of assets, liabilities, and equity.
              </p>
            </div>
            <Button
              onClick={() => exportAdvancedPDF('trial')}
              isLoading={isExporting}
              disabled={loadingTrial || !trialBalance}
              variant="outline"
              className="flex items-center gap-2 px-5 py-2.5 bg-muted/50 hover:bg-muted border border-border/50 rounded-xl transition-colors font-semibold text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
          </div>

          {loadingTrial ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card/40 p-10 rounded-[2.5rem] border border-border/40 shadow-sm backdrop-blur-md">
              <div className="space-y-8">
                <div className="flex justify-between items-center pb-4 border-b border-border/20">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-lg" />
                </div>
                <div className="space-y-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/2 rounded-full" />
                      <Skeleton className="h-4 w-1/4 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-border/20">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-1/4 rounded-full" />
                    <Skeleton className="h-6 w-1/3 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="flex justify-between items-center pb-4 border-b border-border/20">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-lg" />
                </div>
                <div className="space-y-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-1/12 rounded-full" />
                      <Skeleton className="h-4 w-1/2 rounded-full" />
                      <Skeleton className="h-4 w-1/4 rounded-full" />
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-border/20">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-1/4 rounded-full" />
                    <Skeleton className="h-6 w-1/3 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ) : trialBalance ? (
            <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                {/* Debit Side (Assets) */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-border/50">
                    <h3 className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                      Debit (Assets)
                    </h3>
                    <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs font-bold">
                      + Balance
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <DollarSign size={14} /> Loans Receivable
                      </span>
                      <span className="font-mono font-medium">
                        {formatCurrency(
                          trialBalance.assets?.loansReceivable || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Landmark size={14} /> Cash at Hand / Bank
                      </span>
                      <span className="font-mono font-medium">
                        {formatCurrency(trialBalance.assets?.cashAtHand || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border/50 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm">Total Assets</span>
                      <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(trialBalance.assets?.totalAssets || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Credit Side (Liabilities & Equity) */}
                <div className="flex flex-col h-full">
                  <div className="p-6 space-y-4 flex-1">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                      <h3 className="font-bold text-muted-foreground uppercase tracking-widest text-xs">
                        Credit (Liabilities & Equity)
                      </h3>
                      <span className="text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded text-xs font-bold">
                        + Balance
                      </span>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase">
                          Liabilities
                        </h4>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <ArrowRightLeft size={14} /> Member Capital
                          </span>
                          <span className="font-mono font-medium">
                            {formatCurrency(
                              trialBalance.liabilities?.memberCapital || 0,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase">
                          Equity
                        </h4>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <TrendingUp size={14} /> Retained Earnings
                          </span>
                          <span className="font-mono font-medium">
                            {formatCurrency(
                              trialBalance.equity?.retainedEarnings || 0,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-4 border-t border-border/50 bg-muted/10 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm">Total L & E</span>
                      <span className="font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(
                          (trialBalance.liabilities?.totalLiabilities || 0) +
                            (trialBalance.equity?.totalEquity || 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-3xl border border-border/50 text-muted-foreground">
              Data unavailable.
            </div>
          )}
        </div>
      ) : activeTab === 'profit-loss' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-3xl border border-border/50 shadow-sm">
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <FileText className="text-indigo-500 w-5 h-5" /> Profit & Loss
                Statement
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Income and expenses over a specific period.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full sm:w-auto"
              />
              <Button
                onClick={() => exportAdvancedPDF('pnl')}
                isLoading={isExporting}
                disabled={loadingPnL || !pnl}
                variant="outline"
                className="flex items-center gap-2 px-5 py-2.5 bg-muted/50 hover:bg-muted border border-border/50 rounded-xl transition-colors font-semibold text-sm ml-auto"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
            </div>
          </div>

          {loadingPnL ? (
            <div className="p-8 bg-card/40 rounded-3xl border border-border/10">
              <TableSkeleton rows={8} columns={2} />
            </div>
          ) : pnl ? (
            <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden p-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <tbody>
                  {/* REVENUE */}
                  <tr className="bg-muted/30">
                    <td
                      colSpan={2}
                      className="p-4 font-black text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      Gross Revenue
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 pl-8 border-b border-border/50 text-foreground/80 flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-500" />{' '}
                      Interest Earned
                    </td>
                    <td className="p-4 border-b border-border/50 text-right font-mono">
                      {formatCurrency(pnl.revenue.interestEarned || 0)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-500/5">
                    <td className="p-4 pl-8 font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      Total Revenue
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(pnl.revenue.totalRevenue || 0)}
                    </td>
                  </tr>

                  {/* EXPENSES */}
                  <tr className="bg-muted/30">
                    <td
                      colSpan={2}
                      className="p-4 font-black text-xs uppercase tracking-widest text-muted-foreground flex mt-4"
                    >
                      Operating Expenses
                    </td>
                  </tr>
                  {Object.entries(pnl.expenses.breakdown || {}).length > 0 ? (
                    Object.entries(pnl.expenses.breakdown).map(
                      ([category, amount]) => (
                        <tr key={category}>
                          <td className="p-4 pl-8 border-b border-border/50 text-foreground/80 flex items-center gap-2 capitalize">
                            <TrendingDown size={14} className="text-red-500" />{' '}
                            {category}
                          </td>
                          <td className="p-4 border-b border-border/50 text-right font-mono">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td className="p-4 pl-8 border-b border-border/50 text-muted-foreground italic text-xs">
                        No expenses recorded in this period.
                      </td>
                      <td className="p-4 border-b border-border/50 text-right font-mono">
                        {formatCurrency(0)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-red-500/5">
                    <td className="p-4 pl-8 font-black text-red-600 dark:text-red-400 flex items-center gap-2">
                      Total Expenses
                    </td>
                    <td className="p-4 text-right font-mono font-black text-red-600 dark:text-red-400">
                      {formatCurrency(pnl.expenses.totalExpenses || 0)}
                    </td>
                  </tr>

                  {/* DISTRIBUTIONS */}
                  <tr className="bg-muted/30">
                    <td
                      colSpan={2}
                      className="p-4 font-black text-xs uppercase tracking-widest text-muted-foreground flex mt-4"
                    >
                      Profit Distributions
                    </td>
                  </tr>
                  {Object.entries(pnl.distributions.breakdown || {}).length >
                  0 ? (
                    Object.entries(pnl.distributions.breakdown).map(
                      ([type, amount]) => (
                        <tr key={type}>
                          <td className="p-4 pl-8 border-b border-border/50 text-foreground/80 flex items-center gap-2 capitalize">
                            <TrendingDown
                              size={14}
                              className="text-amber-500"
                            />{' '}
                            {type} Profit
                          </td>
                          <td className="p-4 border-b border-border/50 text-right font-mono">
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td className="p-4 pl-8 border-b border-border/50 text-muted-foreground italic text-xs">
                        No distributions recorded in this period.
                      </td>
                      <td className="p-4 border-b border-border/50 text-right font-mono">
                        {formatCurrency(0)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-amber-500/5">
                    <td className="p-4 pl-8 font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      Total Distributions
                    </td>
                    <td className="p-4 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(
                        pnl.distributions.totalDistributions || 0,
                      )}
                    </td>
                  </tr>

                  {/* NET INCOME */}
                  <tr
                    className={cn(
                      'border-t-2 border-border',
                      (pnl.netIncome || 0) >= 0
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white',
                    )}
                  >
                    <td className="p-5 pl-8 font-black text-base flex items-center gap-2 mt-2 border-none">
                      NET INCOME
                    </td>
                    <td className="p-5 text-right font-mono font-black text-lg border-none tracking-tight">
                      {formatCurrency(pnl.netIncome || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-3xl border border-border/50 text-muted-foreground">
              Data unavailable.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Reports;
