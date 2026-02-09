import { useState, useEffect, useCallback } from 'react';
import { Search, DollarSign, TrendingUp, Hash } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import TransactionTable from '@/components/TransactionTable';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import TableSkeleton from '@/components/TableSkeleton';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
// import { Card, CardContent, CardHeader } from '@/components/ui/card'; // Unused

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/repayments?page=${currentPage}&limit=${limit}&search=${searchQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      );
      setTransactions(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchQuery, sortBy, sortOrder]);

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
      fetchTransactions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchTransactions]);

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount =
    transactions.length > 0
      ? (totalAmount / transactions.length).toFixed(0)
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Transactions"
        description="Real-time history of all loan repayments and settlements."
      />

      {/* Summary Cards */}
      {loading ? (
        <CardsSkeleton count={3} className="md:grid-cols-3 lg:grid-cols-3" />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <StatsCard
            title="Total Transactions"
            amount={transactions.length}
            icon={<Hash size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Total Collected"
            amount={formatPKR(totalAmount)}
            icon={<DollarSign size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Average Payment"
            amount={formatPKR(averageAmount)}
            icon={<TrendingUp size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
        </div>
      )}

      {/* Filter and Table Section */}
      <div className="space-y-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {loading ? (
          <TableSkeleton />
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
