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
          request={selectedRequest}
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

const ApproveLoanModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      principal: request.principal,
      rate: request.rate || 0,
      duration: request.duration,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.put(`/loans/${request._id}`, {
        ...data,
        status: 'active',
      });
      toast.success('Loan approved and activated!');
      onSuccess();
    } catch (error) {
      console.error('Approval failed', error);
      toast.error('Failed to approve loan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            Approve Loan
          </DialogTitle>
        </DialogHeader>

        {request.riskDetails ? (
          <div
            className={`mt-4 p-4 rounded-xl border ${
              ['A+', 'A'].includes(request.riskDetails.grade)
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : ['B', 'C'].includes(request.riskDetails.grade)
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                AI Risk Assessment
              </h4>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  ['A+', 'A'].includes(request.riskDetails.grade)
                    ? 'bg-emerald-500 text-white'
                    : ['B', 'C'].includes(request.riskDetails.grade)
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-500 text-white'
                }`}
              >
                Grade {request.riskDetails.grade}
              </span>
            </div>
            <p className="text-sm font-bold mb-2">
              Recommended: {request.riskDetails.suggestion}
            </p>
            <ul className="space-y-1">
              {request.riskDetails.factors.map((factor, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-muted-foreground flex items-center gap-2"
                >
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl border border-dashed border-border/50 bg-muted/5 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">
              AI Risk Assessment
            </span>
            <span className="text-xs font-black text-muted-foreground/50">
              —
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                Principal
              </label>
              <input
                type="number"
                {...register('principal', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                Interest Rate <Percent size={12} />
              </label>
              <input
                type="number"
                step="0.01"
                {...register('rate', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                Duration (Months)
              </label>
              <input
                type="number"
                {...register('duration', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                Start Date <Calendar size={12} />
              </label>
              <input
                type="date"
                {...register('startDate', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirm Approval'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoanRequests;
