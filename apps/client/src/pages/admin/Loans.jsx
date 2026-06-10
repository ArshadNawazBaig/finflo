import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  CreditCard,
  ExternalLink,
  Coins,
  Download,
  Upload,
} from 'lucide-react';
import TableSearch from '@/components/ui/TableSearch';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import LoanTable from '@/components/loans/LoanTable';
import LoanCard from '@/components/loans/LoanCard';
import PageHeader from '@/components/PageHeader';
import AddLoanModal from '@/components/loans/AddLoanModal';
import BulkImportLoansModal from '@/components/loans/BulkImportLoansModal';
import RenewLoanModal from '@/components/loans/RenewLoanModal';
import RepayLoanModal from '@/components/loans/RepayLoanModal';
import LoanDetailsModal from '@/components/loans/LoanDetailsModal';
import EditLoanModal from '@/components/loans/EditLoanModal';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import StatsCard from '@/components/StatsCard';
import { LoansPageSkeleton } from '@/components/ui/PageSkeletons';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState(null);
  const [detailLoan, setDetailLoan] = useState(null);
  const [editLoan, setEditLoan] = useState(null);
  const [renewLoan, setRenewLoan] = useState(null);
  const [deleteLoan, setDeleteLoan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const isMobile = useIsMobile();
  const [stats, setStats] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Loans must be attributed to a branch, so loan creation is blocked until the
  // business has created at least one branch.
  const [hasBranch, setHasBranch] = useState(true);
  useEffect(() => {
    let active = true;
    api
      .get('/branches')
      .then(({ data }) => {
        if (active) setHasBranch(Array.isArray(data) && data.length > 0);
      })
      .catch(() => {
        if (active) setHasBranch(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const noBranch = !hasBranch;

  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);


  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
    setCurrentPage(1);
  }, [isMobile]);

  const fetchLoans = useCallback(
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

        if (isAppend) {
          setLoans((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const newLoans = (data.data || []).filter(
              (l) => !existingIds.has(l._id),
            );
            return [...prev, ...newLoans];
          });
          skipNextEffect.current = true;
          setCurrentPage(pageToFetch);
        } else {
          setLoans(data.data || []);
        }

        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
      } catch (error) {
        console.error('Failed to fetch loans', error);
        toast.error('Failed to load loans');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, limit, searchTerm, sortBy, sortOrder],
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
          fetchLoans(true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchLoans]);

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

    const delayDebounceFn = setTimeout(() => {
      fetchLoans(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy, sortOrder, limit, currentPage, isMobile]); // Include currentPage to trigger refetch on page change

  const handleDeleteConfirm = async () => {
    if (!deleteLoan) return;

    try {
      setIsDeleting(true);
      await api.delete(`/loans/${deleteLoan._id}`);
      toast.success('Loan deleted successfully');
      fetchLoans();
      fetchStats();
      setDeleteLoan(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete loan');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && loans.length === 0 && !searchTerm) {
    return <LoansPageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Loan Portfolio"
        description="Monitor active loans and track repayment status."
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              if (noBranch) {
                toast.error('Create a branch before importing loans.');
                return;
              }
              setIsImportOpen(true);
            }}
            disabled={noBranch}
            className="group inline-flex items-center justify-center gap-2.5 px-6 py-3 h-auto rounded-full font-bold text-[13px] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={14} strokeWidth={2.5} />
            Import Old Loans
          </Button>
          <Button
            onClick={() => {
              if (noBranch) {
                toast.error('Create a branch before issuing loans.');
                return;
              }
              setIsModalOpen(true);
            }}
            disabled={noBranch}
            title={noBranch ? 'Create a branch before issuing loans' : undefined}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            isLoading={loading && loans.length === 0}
          >
            <Plus size={14} strokeWidth={2.5} />
            New Loan
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid - Moved from Dashboard */}
      {/* Stats Grid - Moved from Dashboard */}
      {!stats ? (
        <div className="mb-8">
          <CardsSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Active Loans"
            amount={stats.activeLoans?.count || 0}
            percentage={stats.activeLoans?.percentage}
            subtitle="Currently Active"
            icon={<ExternalLink size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Outstanding"
            amount={formatCurrency(stats.outstanding?.amount || 0)}
            percentage={stats.outstanding?.percentage}
            subtitle="Total Receivable"
            icon={<Download size={20} />}
            color="bg-orange-500 shadow-orange-500/20"
          />
          <StatsCard
            title="Total Repaid"
            amount={formatCurrency(stats.totalRepaid?.amount || 0)}
            percentage={stats.totalRepaid?.percentage}
            subtitle="Successfully Recovered"
            icon={<Coins size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Total Loans"
            amount={totalEntries}
            subtitle="Lifetime Issuance"
            icon={<CreditCard size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <TableSearch
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder="Search loans..."
        />
      </div>

      <div className="mt-4">
        {loading && !isFetchingMore ? (
          <div className="py-6">
            {isMobile ? (
              <InfiniteLoader isFetchingMore={true} />
            ) : (
              <TableSkeleton rows={limit} columns={6} />
            )}
          </div>
        ) : isMobile ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {loans.map((loan) => (
                <LoanCard
                  key={loan._id}
                  loan={loan}
                  onEdit={setEditLoan}
                  onDelete={setDeleteLoan}
                  onRenew={setRenewLoan}
                  onRefresh={() => {
                    fetchLoans();
                    fetchStats();
                  }}
                />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {currentPage < totalPages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}

            {loans.length === 0 && (
              <EmptyState
                icon={CreditCard}
                title="No Loans Found"
                description={
                  searchTerm
                    ? "We couldn't find any loans matching your search."
                    : 'No loans have been issued yet. Start by creating a new loan for a customer.'
                }
                className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] rounded-[2rem]"
              />
            )}
          </div>
        ) : (
          <LoanTable
            data={loans}
            onRefresh={() => {
              fetchLoans();
              fetchStats();
            }}
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
            onRepay={(loan) => setRepayLoan(loan)}
            onDetails={(loan) => setDetailLoan(loan)}
            onEdit={(loan) => setEditLoan(loan)}
            onRenew={(loan) => setRenewLoan(loan)}
            onDelete={(loan) => setDeleteLoan(loan)}
          />
        )}
      </div>

      <AddLoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchLoans();
          fetchStats();
        }}
      />

      <BulkImportLoansModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          fetchLoans();
          fetchStats();
        }}
      />

      <RenewLoanModal
        isOpen={!!renewLoan}
        loan={renewLoan}
        onClose={() => setRenewLoan(null)}
        onSuccess={() => {
          fetchLoans();
          fetchStats();
        }}
      />

      <RepayLoanModal
        isOpen={!!repayLoan}
        onClose={() => setRepayLoan(null)}
        loan={repayLoan}
        onSuccess={() => {
          fetchLoans();
          fetchStats();
        }}
      />

      <LoanDetailsModal
        isOpen={!!detailLoan}
        onClose={() => setDetailLoan(null)}
        loan={detailLoan}
        onUpdate={(updatedLoan) => {
          setDetailLoan(updatedLoan);
          fetchLoans();
          fetchStats();
        }}
      />

      <EditLoanModal
        isOpen={!!editLoan}
        onClose={() => setEditLoan(null)}
        loan={editLoan}
        onSuccess={() => {
          fetchLoans();
          fetchStats();
        }}
      />

      <ConfirmActionModal
        isOpen={!!deleteLoan}
        onClose={() => setDeleteLoan(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Loan"
        description={
          <>
            Are you sure you want to delete the loan for{' '}
            <strong>{deleteLoan?.customer?.name}</strong>? This will also delete
            all associated repayments. This action cannot be undone.
          </>
        }
        confirmText="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
};

export default Loans;
