import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  Hash,
  ArrowDown,
  Download,
  FileSpreadsheet,
  RotateCcw,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { exportCashFlowStatement } from '@/lib/cashFlowPdfUtils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import TableSearch from '@/components/ui/TableSearch';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import api from '@/lib/axios';
import StatsCard from '@/components/StatsCard';
import TransactionTable from '@/components/payments/TransactionTable';
import TransactionCard from '@/components/payments/TransactionCard';
import PageHeader from '@/components/PageHeader';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { saveFile } from '@/lib/nativeDownload';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
  });
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};

  // Reversal state
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
    setCurrentPage(1);
  }, [isMobile]);

  const fetchTransactions = useCallback(
    async (isAppend = false, pageOverride) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch =
          pageOverride || (isAppend ? currentPage + 1 : currentPage);
        const { data } = await api.get('/ledger', {
          params: {
            page: pageToFetch,
            limit,
            search: searchQuery,
            sortBy,
            sortOrder,
            startDate: dateRange?.from?.toISOString(),
            endDate: dateRange?.to?.toISOString(),
          },
        });

        if (isAppend) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t._id));
            const newTransactions = (data.data || []).filter(
              (t) => !existingIds.has(t._id),
            );
            return [...prev, ...newTransactions];
          });
          skipNextEffect.current = true;
          setCurrentPage(pageToFetch);
        } else {
          setTransactions(data.data || []);
        }

        if (data.summary) {
          setSummary(data.summary);
        }
        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
      } catch (error) {
        console.error('Failed to fetch transactions', error);
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, limit, searchQuery, sortBy, sortOrder, dateRange],
  );

  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchTransactions(true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchTransactions]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(
      () => {
        fetchTransactions(false);
      },
      searchQuery ? 500 : 0,
    );

    return () => clearTimeout(delayDebounceFn);
  }, [
    searchQuery,
    sortBy,
    sortOrder,
    limit,
    isMobile,
    dateRange,
    currentPage,
    fetchTransactions,
  ]);

  const handleDownload = async () => {
    try {
      if (!dateRange?.from || !dateRange?.to) {
        toast.error('Please select a date range first');
        return;
      }

      setIsExportingModal(true);
      const response = await api.get('/dashboard/download-statement', {
        params: {
          startDate: startOfDay(dateRange.from).toISOString(),
          endDate: endOfDay(dateRange.to).toISOString(),
          format: 'json',
        },
      });

      await exportCashFlowStatement(
        response.data,
        dateRange,
        user?.name,
        'Global Ledger',
      );
      toast.success('Statement generated successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Failed to download statement', error);
      toast.error('Failed to download statement');
    } finally {
      setIsExportingModal(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const params = new URLSearchParams({
        search: searchQuery,
        sortBy,
        sortOrder,
        startDate: dateRange?.from?.toISOString() || '',
        endDate: dateRange?.to?.toISOString() || '',
      });

      const response = await api.get(`/ledger/export?${params.toString()}`, {
        responseType: 'blob',
      });

      await saveFile(
        new Blob([response.data]),
        `transactions_export_${new Date().getTime()}.xlsx`,
      );
      toast.success('Excel export completed');
    } catch (error) {
      console.error('Failed to export to Excel', error);
      toast.error('Failed to export transactions');
    } finally {
      setIsExportingExcel(false);
    }
  };

  if (loading && transactions.length === 0) {
    return <TablePageSkeleton />;
  }

  const handleReverseTransaction = async () => {
    if (!reversalTarget || !reversalReason.trim()) return;
    try {
      setIsReversing(true);
      await api.post(`/ledger/${reversalTarget._id}/reverse`, {
        reason: reversalReason.trim(),
      });
      toast.success('Transaction reversed successfully');
      setReversalTarget(null);
      setReversalReason('');
      fetchTransactions(false);
    } catch (error) {
      console.error('Reverse Error:', error);
      toast.error(
        error.response?.data?.message || 'Failed to reverse transaction',
      );
    } finally {
      setIsReversing(false);
    }
  };

  const netCashFlow = summary.totalIncome - summary.totalExpense;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={
          <>
            Financial <span className="text-primary ">Ledger</span>
          </>
        }
        description="Real-time history of all loan repayments and settlements."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <StatsCard
          title="Total Transactions"
          amount={summary.totalTransactions}
          icon={<Hash size={20} />}
          color="bg-primary shadow-primary/20"
        />
        <StatsCard
          title="Total Income"
          amount={formatCurrency(summary.totalIncome)}
          icon={<TrendingUp size={20} />}
          color="bg-emerald-500 shadow-emerald-500/20"
        />
        <StatsCard
          title="Total Expense"
          amount={formatCurrency(summary.totalExpense)}
          icon={<ArrowDown size={20} />}
          color="bg-rose-500 shadow-rose-500/20"
        />
        <StatsCard
          title="Net Cash Flow"
          amount={formatCurrency(netCashFlow)}
          icon={<DollarSign size={20} />}
          color={
            netCashFlow >= 0
              ? 'bg-blue-500 shadow-blue-500/20'
              : 'bg-orange-500 shadow-orange-500/20'
          }
        />
      </div>

      {/* Filter and Table Section */}
      <div className="space-y-4">
        {/* Filter Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/10 p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full justify-between">
            <TableSearch
              value={searchQuery}
              onChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="Search transactions..."
              className="w-full sm:w-auto sm:min-w-[300px]"
            />
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full sm:w-auto"
              />
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-[1.25rem] flex-1 group overflow-hidden border-primary/10 bg-white/5 backdrop-blur-xl h-12 shrink-0 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)]"
                  onClick={() => setIsExportModalOpen(true)}
                  title="Download Statement (PDF)"
                >
                  <Download className="relative w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-500" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-[1.25rem] flex-1 group overflow-hidden border-primary/10 bg-white/5 backdrop-blur-xl h-12 shrink-0 transition-all duration-500 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  onClick={handleExportExcel}
                  isLoading={isExportingExcel}
                  title="Export to Excel"
                >
                  <FileSpreadsheet className="relative w-4 h-4 text-emerald-500 group-hover:scale-125 transition-transform duration-500" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction._id}
                  transaction={transaction}
                  onReverse={(tx) => setReversalTarget(tx)}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {currentPage < totalPages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}

            {transactions.length === 0 && (
              <EmptyState
                icon={Hash}
                title="No Transactions Found"
                description={
                  searchQuery
                    ? "We couldn't find any transactions matching your search."
                    : 'No financial transactions have been recorded yet.'
                }
                className="border-none bg-card/50"
              />
            )}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-border/40 bg-card/10 backdrop-blur-sm overflow-hidden">
            <TransactionTable
              data={transactions}
              pagination={{
                currentPage,
                totalPages,
                totalEntries,
                limit,
                onPageChange: setCurrentPage,
                onLimitChange: (newLimit) => {
                  setLimit(newLimit);
                  setCurrentPage(1);
                },
              }}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onReverse={(tx) => setReversalTarget(tx)}
            />
          </div>
        )}
      </div>

      {/* Reversal Confirmation Dialog */}
      <Dialog
        open={!!reversalTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReversalTarget(null);
            setReversalReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[1.5rem] sm:rounded-[2.5rem] !p-0 border-none shadow-2xl overflow-hidden flex flex-col gap-0 bg-card">
          {/* Gradient Header */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 sm:p-10 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-10">
              <RotateCcw size={64} className="sm:w-20 sm:h-20" />
            </div>
            <DialogHeader className="relative z-10 text-left items-start">
              <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter leading-none mb-2">
                Reverse Transaction
              </DialogTitle>
              <DialogDescription className="text-white/70 font-black uppercase tracking-[0.2em] text-[8px] sm:text-[10px]">
                Financial Correction Authorization
              </DialogDescription>
            </DialogHeader>
          </div>

          {reversalTarget && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
                {/* Transaction Details */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                    Transaction Details
                  </Label>
                  <div className="bg-muted/30 rounded-2xl border border-border/20 overflow-hidden divide-y divide-border/20">
                    <div className="flex items-center justify-between p-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        Amount
                      </span>
                      <span className="font-black text-lg tabular-nums text-orange-600">
                        {formatCurrency(reversalTarget.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        Category
                      </span>
                      <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-black uppercase tracking-widest">
                        {reversalTarget.category?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        Related To
                      </span>
                      <span className="font-bold text-sm capitalize">
                        {reversalTarget.customer?.name ||
                          reversalTarget.member?.name ||
                          'System'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        Type
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          reversalTarget.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {reversalTarget.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                  <AlertTriangle
                    size={18}
                    className="text-orange-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-orange-700 dark:text-orange-400 font-medium leading-relaxed">
                    This will undo all financial effects and create a
                    counter-entry in the ledger. This action cannot be undone.
                  </p>
                </div>

                {/* Reason Input */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                    Reason for Reversal *
                  </Label>
                  <Input
                    id="reversal-reason"
                    placeholder="E.g. Wrong amount entered, should be 1,000 instead of 10,000"
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    className="h-14 sm:h-16 rounded-2xl border-border/40 bg-muted/30 font-bold text-sm sm:text-base tracking-tight px-6 focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="px-6 sm:px-10 pb-6 sm:pb-8 shrink-0 mt-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setReversalTarget(null);
                  setReversalReason('');
                }}
                className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest border-border/40 hover:bg-muted/50 order-2 sm:order-1 transition-all"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !reversalReason.trim() || reversalReason.trim().length < 3
                }
                isLoading={isReversing}
                onClick={handleReverseTransaction}
                className="flex-[1.5] rounded-xl h-12 font-black uppercase tracking-[0.2em] text-[10px] bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 transform transition-all active:scale-95 order-1 sm:order-2 gap-2"
              >
                <RotateCcw size={14} />
                Authorize Reversal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Report Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl bg-background">
          {/* Fixed Header */}
          <div className="p-8 border-b bg-background z-10 shrink-0 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Download size={24} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  Financial Statement
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                  Select the date range for your cash flow analysis report.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="space-y-6">
              <div className="">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block text-center">
                  Select Report Period
                </label>
                <div className="flex justify-center">
                  <DateRangePicker
                    date={dateRange}
                    setDate={setDateRange}
                    className=""
                  />
                </div>
                <p className="text-[9px] text-center text-muted-foreground mt-4 leading-relaxed font-medium">
                  Note: Generating reports for long periods may take a few
                  moments.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
              className="flex-1 rounded-[1.25rem] min-h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all"
              disabled={isExportingModal}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleDownload}
              disabled={isExportingModal}
              className="flex-1 min-h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all border border-primary/20 text-white"
            >
              {isExportingModal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} className="mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
