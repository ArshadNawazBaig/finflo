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
  AlertTriangle,
  Activity,
  Receipt,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import TablePagination from '@/components/ui/table-pagination';
import api from '@/lib/axios';
import { formatFullCurrency as formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const ROWS_PER_PAGE = 9;

const KPI_TILES = [
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
    if (!branchSummaries) {
      fetchBranchSummaries();
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
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
