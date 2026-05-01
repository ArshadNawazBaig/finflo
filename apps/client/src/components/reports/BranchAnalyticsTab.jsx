import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import TablePagination from '@/components/ui/table-pagination';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import api from '@/lib/axios';
import {
  formatFullCurrency as formatCurrency,
  cn,
} from '@/lib/utils';
import { toast } from 'sonner';

const ROWS_PER_PAGE = 10;

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
        <CardContent className="p-0">
          {loadingBranch ? (
            <div className="p-6">
              <TableSkeleton rows={5} columns={8} />
            </div>
          ) : branchSummaries && branchSummaries.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-black">
                    <tr>
                      <th className="px-6 py-3">Branch</th>
                      <th className="px-6 py-3 text-center">Members</th>
                      <th className="px-6 py-3 text-right">Deposits</th>
                      <th className="px-6 py-3 text-center">
                        Active Loans
                      </th>
                      <th className="px-6 py-3 text-right">
                        Disbursed Volume
                      </th>
                      <th className="px-6 py-3 text-right">Outstanding</th>
                      <th className="px-6 py-3 text-right">Profit</th>
                      <th className="px-6 py-3 text-right">Expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {branchSummaries
                      .slice(
                        (branchPage - 1) * ROWS_PER_PAGE,
                        branchPage * ROWS_PER_PAGE,
                      )
                      .map((branch) => (
                        <tr
                          key={branch._id}
                          className="hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-6 py-3 font-bold">
                            {branch.name}
                            <span className="text-[10px] text-muted-foreground tabular-nums block mt-0.5">
                              {branch.code}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center font-medium">
                            {branch.stats.totalMembers}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-medium text-blue-500">
                            {formatCurrency(branch.stats.totalInvested)}
                          </td>
                          <td className="px-6 py-3 text-center font-medium">
                            {branch.stats.activeLoans}{' '}
                            <span className="text-[10px] text-muted-foreground">
                              / {branch.stats.totalLoans}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-medium text-emerald-500">
                            {formatCurrency(branch.stats.totalVolume)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-medium text-amber-500">
                            {formatCurrency(branch.stats.totalOutstanding)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-medium text-indigo-500">
                            {formatCurrency(branch.stats.totalProfit)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums font-medium text-rose-500">
                            {formatCurrency(branch.stats.totalExpenses)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="xl:hidden flex flex-col gap-4 p-4">
                {branchSummaries
                  .slice(
                    (branchPage - 1) * ROWS_PER_PAGE,
                    branchPage * ROWS_PER_PAGE,
                  )
                  .map((branch) => (
                    <div
                      key={branch._id}
                      className="p-4 rounded-2xl bg-muted/5 border border-border/30 space-y-4"
                    >
                      <div className="flex justify-between items-center border-b border-border/10 pb-3">
                        <div>
                          <div className="font-bold text-base">{branch.name}</div>
                          <div className="text-[10px] font-mono font-bold text-muted-foreground tabular-nums mt-0.5">
                            {branch.code}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Members
                          </div>
                          <div className="font-bold">
                            {branch.stats.totalMembers}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-xs">
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Deposits
                          </div>
                          <div className="font-bold text-blue-500 tabular-nums">
                            {formatCurrency(branch.stats.totalInvested)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Loans
                          </div>
                          <div className="font-bold tabular-nums">
                            {branch.stats.activeLoans}{' '}
                            <span className="text-[9px] text-muted-foreground">
                              / {branch.stats.totalLoans}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Disbursed
                          </div>
                          <div className="font-bold text-emerald-500 tabular-nums">
                            {formatCurrency(branch.stats.totalVolume)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Outstanding
                          </div>
                          <div className="font-bold text-amber-500 tabular-nums">
                            {formatCurrency(
                              branch.stats.totalOutstanding,
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Profit
                          </div>
                          <div className="font-bold text-indigo-500 tabular-nums">
                            {formatCurrency(branch.stats.totalProfit)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Expenses
                          </div>
                          <div className="font-bold text-rose-500 tabular-nums">
                            {formatCurrency(branch.stats.totalExpenses)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <TablePagination
                currentPage={branchPage}
                totalPages={Math.ceil(
                  branchSummaries.length / ROWS_PER_PAGE,
                )}
                onPageChange={setBranchPage}
              />
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground min-h-[300px] flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Building2
                  size={48}
                  strokeWidth={1}
                  className="mb-4 opacity-20"
                />
                <p className="text-xs font-black uppercase tracking-widest">
                  No Branch Data Available
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Ensure you have active branches with data.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BranchAnalyticsTab;
