import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  DollarSign,
  TrendingUp,
  Hash,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import TableSearch from '@/components/ui/TableSearch';
import StatsCard from '@/components/StatsCard';
import TransactionTable from '@/components/TransactionTable';
import TransactionCard from '@/components/TransactionCard';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import TableSkeleton from '@/components/TableSkeleton';
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

  const observerTarget = useRef(null);

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
    async (isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : currentPage;
        const { data } = await api.get(
          `/ledger?page=${pageToFetch}&limit=${limit}&search=${searchQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        );

        if (isAppend) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((t) => t._id));
            const newTransactions = (data.data || []).filter(
              (t) => !existingIds.has(t._id),
            );
            return [...prev, ...newTransactions];
          });
          setCurrentPage(pageToFetch);
        } else {
          setTransactions(data.data || []);
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
    [currentPage, limit, searchQuery, sortBy, sortOrder],
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
    const delayDebounceFn = setTimeout(() => {
      fetchTransactions(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, sortBy, sortOrder, limit, isMobile]);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashFlow = totalIncome - totalExpense;

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
      {loading && !isFetchingMore ? (
        <CardsSkeleton count={3} className="md:grid-cols-3 lg:grid-cols-3" />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <StatsCard
            title="Total Transactions"
            amount={transactions.length}
            icon={<Hash size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Total Income"
            amount={formatPKR(totalIncome)}
            icon={<TrendingUp size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Total Expense"
            amount={formatPKR(totalExpense)}
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
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <TableSearch
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            placeholder="Search transactions..."
          />
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
