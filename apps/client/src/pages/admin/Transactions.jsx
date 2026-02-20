import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  DollarSign,
  TrendingUp,
  Hash,
  Loader2,
  ArrowDown,
  Download,
} from 'lucide-react';
import { subMonths } from 'date-fns';
import { exportCashFlowStatement } from '@/lib/cashFlowPdfUtils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import TableSearch from '@/components/ui/TableSearch';
import StatsCard from '@/components/StatsCard';
import TransactionTable from '@/components/payments/TransactionTable';
import TransactionCard from '@/components/payments/TransactionCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpense: 0,
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setLimit(3);
    } else {
      setLimit(10);
    }
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

      const response = await api.get('/dashboard/download-statement', {
        params: {
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
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
    } catch (error) {
      console.error('Failed to download statement', error);
      toast.error('Failed to download statement');
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
      {loading && !transactions.length ? (
        <CardsSkeleton count={3} className="md:grid-cols-3 lg:grid-cols-3" />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <StatsCard
            title="Total Transactions"
            amount={summary.totalTransactions}
            icon={<Hash size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Total Income"
            amount={formatPKR(summary.totalIncome)}
            icon={<TrendingUp size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Total Expense"
            amount={formatPKR(summary.totalExpense)}
            icon={<ArrowDown size={20} />}
            color="bg-rose-500 shadow-rose-500/20"
          />
          <StatsCard
            title="Net Cash Flow"
            amount={formatPKR(netCashFlow)}
            icon={<DollarSign size={20} />}
            color={
              netCashFlow >= 0
                ? 'bg-blue-500 shadow-blue-500/20'
                : 'bg-orange-500 shadow-orange-500/20'
            }
          />
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full sm:w-auto"
              />
              <Button
                variant="outline"
                size="icon"
                className="relative rounded-[1.25rem] group overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl h-12 w-12 shrink-0 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)]"
                onClick={handleDownload}
                title="Download Statement (PDF)"
              >
                <Download className="relative w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-500" />
              </Button>
            </div>
          </div>
        </div>

        {loading && !isFetchingMore ? (
          <div className="py-20 flex justify-center items-center">
            {isMobile ? (
              <InfiniteLoader isFetchingMore={true} />
            ) : (
              <TableSkeleton />
            )}
          </div>
        ) : isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction._id}
                  transaction={transaction}
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
          <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
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
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
