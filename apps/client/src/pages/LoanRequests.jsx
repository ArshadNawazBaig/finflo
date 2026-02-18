import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileQuestion,
  Check,
  X,
  Loader2,
  Calendar,
  Percent,
  Search,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { formatPKR } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LoanRequestTable from '@/components/LoanRequestTable';
import LoanRequestCard from '@/components/LoanRequestCard';
import TableSkeleton from '@/components/TableSkeleton';
import InfiniteLoader from '@/components/InfiniteLoader';
import CardsSkeleton from '@/components/CardsSkeleton';
import StatsCard from '@/components/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import ApproveLoanModal from '@/components/loans/ApproveLoanModal';

const LoanRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Statistics State
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Mobile & Infinite Scroll State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setLimit(5);
    } else {
      setLimit(10);
    }
    setCurrentPage(1);
  }, [isMobile]);

  const fetchRequests = useCallback(
    async (isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
          setCurrentPage(1);
        }

        const pageToFetch = isAppend ? currentPage + 1 : 1;
        const { data } = await api.get(
          `/loans?page=${pageToFetch}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        );

        const allLoans = data.data || [];

        if (isAppend) {
          setRequests((prev) => {
            const existingIds = new Set(prev.map((r) => r._id));
            const newRequests = allLoans.filter((r) => !existingIds.has(r._id));
            return [...prev, ...newRequests];
          });
          setCurrentPage(pageToFetch);
        } else {
          setRequests(allLoans);
        }

        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
      } catch (error) {
        console.error('Failed to fetch requests', error);
        toast.error('Failed to load loan requests');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, limit, searchTerm, sortBy, sortOrder],
  );

  const fetchStats = useCallback(async () => {
    try {
      // Fetch all loans to calculate statistics
      const { data } = await api.get('/loans?limit=1000');
      const allLoans = data.data || [];

      setStats({
        pending: allLoans.filter((loan) => loan.status === 'pending').length,
        approved: allLoans.filter((loan) => loan.status === 'active').length,
        rejected: allLoans.filter((loan) => loan.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Failed to fetch statistics', error);
    }
  }, []);

  // Handle Sort Change
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Infinite Scroll Observer (Mobile)
  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchRequests(true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchRequests]);

  useEffect(() => {
    // Only call fetchRequests without isAppend to RESET when search/sort/limit changes
    // We explicitly EXCLUDE currentPage from this effect's trigger logic
    // but the useCallback still needs it for pagination.
    fetchRequests(false);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sortBy, sortOrder, limit, fetchStats]);

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setIsApproveModalOpen(true);
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this loan request?')) return;

    setProcessingId(id);
    try {
      await api.put(`/loans/${id}`, { status: 'rejected' });
      toast.success('Loan request rejected');
      fetchRequests();
      fetchStats(); // Refresh statistics
    } catch (error) {
      console.error('Reject failed', error);
      toast.error('Failed to reject loan');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Loan Requests"
        description="Review and approve loan applications from members."
      />

      {/* Statistics Cards */}
      {loading ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <StatsCard
            title="Pending Requests"
            amount={stats.pending}
            icon={<Clock size={20} />}
            color="bg-amber-500 shadow-amber-500/20"
          />
          <StatsCard
            title="Approved Requests"
            amount={stats.approved}
            icon={<CheckCircle size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Rejected Requests"
            amount={stats.rejected}
            icon={<XCircle size={20} />}
            color="bg-red-500 shadow-red-500/20"
          />
        </div>
      )}

      {/* Search Bar */}
      <div className="space-y-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by member name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Desktop: Table View */}
        {!isMobile && (
          <>
            {loading ? (
              <TableSkeleton />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={FileQuestion}
                title="No Loan Requests"
                description="Check back later for new applications or try adjusting your search."
                className="py-12 border-none bg-card/50"
              />
            ) : (
              <LoanRequestTable
                requests={requests}
                onApprove={handleApproveClick}
                onReject={handleReject}
                processingId={processingId}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
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
              />
            )}
          </>
        )}
      </div>

      {/* Mobile: Card View with Infinite Scroll */}
      {isMobile && (
        <>
          {loading && requests.length === 0 ? (
            <div className="py-20 flex justify-center items-center">
              <InfiniteLoader isFetchingMore={true} />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No Loan Requests"
              description="Check back later for new applications or try adjusting your search."
              className="py-12 border-none bg-card/50"
            />
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <LoanRequestCard
                  key={request._id}
                  request={request}
                  onApprove={handleApproveClick}
                  onReject={handleReject}
                  processingId={processingId}
                />
              ))}
              {currentPage < totalPages && (
                <div ref={observerTarget}>
                  <InfiniteLoader isFetchingMore={isFetchingMore} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedRequest && (
        <ApproveLoanModal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          loan={selectedRequest}
          onSuccess={() => {
            fetchRequests();
            fetchStats(); // Refresh statistics
            setIsApproveModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default LoanRequests;
