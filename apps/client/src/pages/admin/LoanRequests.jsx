import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileQuestion,
  Check,
  X,
  Loader2,
  Search,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';


import LoanRequestTable from '@/components/loans/LoanRequestTable';
import LoanRequestCard from '@/components/loans/LoanRequestCard';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';import StatsCard from '@/components/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import ApproveLoanModal from '@/components/loans/ApproveLoanModal';
import RejectLoanModal from '@/components/loans/RejectLoanModal';
import { useIsMobile } from '@/hooks/useIsMobile';

const LoanRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
  const isMobile = useIsMobile();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
    setCurrentPage(1);
  }, [isMobile]);

  const fetchRequests = useCallback(
    async (isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : currentPage;
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
          skipNextEffect.current = true;
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
      setStatsLoading(true);
      const { data } = await api.get('/loans?limit=1000');
      const allLoans = data.data || [];

      setStats({
        pending: allLoans.filter((loan) => loan.status === 'pending').length,
        approved: allLoans.filter((loan) => loan.status === 'active').length,
        rejected: allLoans.filter((loan) => loan.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Failed to fetch statistics', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

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
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }
    // Clear selections on filter/page change to avoid stale state
    setSelectedIds([]);
    fetchRequests(false);
  }, [searchTerm, sortBy, sortOrder, limit, currentPage, fetchRequests]);

  useEffect(() => {
    fetchStats();
  }, [searchTerm, fetchStats]);

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setIsApproveModalOpen(true);
  };

  const handleRejectClick = (id) => {
    const request = requests.find((r) => r._id === id);
    if (request) {
      setSelectedRequest(request);
      setIsRejectModalOpen(true);
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelect = (id, isSelected) => {
    if (isSelected) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const allPendingIds = requests
        .filter((r) => r.status === 'pending')
        .map((r) => r._id);
      setSelectedIds(allPendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;

    // Quick confirmation
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${selectedIds.length} loans?`,
      )
    ) {
      return;
    }

    try {
      setIsBulkProcessing(true);
      const endpoint =
        action === 'approve' ? '/loans/bulk-approve' : '/loans/bulk-reject';
      const payload = { loanIds: selectedIds };

      // If rejecting, we should ideally ask for a reason, but we'll use a generic one for bulk
      if (action === 'reject') {
        payload.reason = 'Rejected via bulk action';
      }

      const res = await api.post(endpoint, payload);

      if (res.data.failedCount > 0) {
        toast.warning(
          `${res.data.processedCount} processed, ${res.data.failedCount} failed.`,
        );
      } else {
        toast.success(
          `Successfully ${action}d ${res.data.processedCount} loans.`,
        );
      }

      setSelectedIds([]);
      fetchRequests();
      fetchStats();
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} loans`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  if (loading && requests.length === 0) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative pb-24">
      <PageHeader
        title="Loan Requests"
        description="Review and approve loan applications from members."
      />

      {/* Statistics Cards */}
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
            {requests.length === 0 && !loading ? (
              <EmptyState
                icon={FileQuestion}
                title="No Loan Requests"
                description="Check back later for new applications or try adjusting your search."
                className="py-12 border-none bg-card/50"
              />
            ) : (
              <div className="relative">
                <LoanRequestTable
                  requests={requests}
                  onApprove={handleApproveClick}
                  onReject={handleRejectClick}
                  processingId={processingId}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
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
              </div>
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
                  onReject={handleRejectClick}
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
        <>
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
          <RejectLoanModal
            isOpen={isRejectModalOpen}
            onClose={() => setIsRejectModalOpen(false)}
            loan={selectedRequest}
            onSuccess={() => {
              fetchRequests();
              fetchStats(); // Refresh statistics
              setIsRejectModalOpen(false);
            }}
          />
        </>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-slate-900 border border-border/50 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <span className="text-white font-bold text-sm tracking-tight">
              {selectedIds.length}{' '}
              <span className="text-white/60 font-medium">selected</span>
            </span>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('reject')}
                disabled={isBulkProcessing}
                className="rounded-full bg-white/5 border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-white/80 transition-all font-bold tracking-tight"
              >
                {isBulkProcessing ? (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                ) : (
                  <X size={14} className="mr-1.5" />
                )}
                Bulk Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkAction('approve')}
                disabled={isBulkProcessing}
                className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all font-bold tracking-tight"
              >
                {isBulkProcessing ? (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Check size={14} className="mr-1.5" />
                )}
                Bulk Approve
              </Button>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="ml-2 p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanRequests;
