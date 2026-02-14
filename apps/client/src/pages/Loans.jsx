import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Loader2, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import TableSearch from '@/components/ui/TableSearch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LoanTable from '@/components/LoanTable';
import LoanCard from '@/components/LoanCard';
import PageHeader from '@/components/PageHeader';
import AddLoanModal from '@/components/AddLoanModal';
import RepayLoanModal from '@/components/RepayLoanModal';
import LoanDetailsModal from '@/components/LoanDetailsModal';
import EditLoanModal from '@/components/EditLoanModal';
import TableSkeleton from '@/components/TableSkeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState(null);
  const [detailLoan, setDetailLoan] = useState(null);
  const [editLoan, setEditLoan] = useState(null);
  const [deleteLoan, setDeleteLoan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
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
    const delayDebounceFn = setTimeout(() => {
      fetchLoans(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy, sortOrder, limit, isMobile]); // Remove fetchLoans from deps to prevent infinite loop or re-fetch on every render

  const handleDeleteConfirm = async () => {
    if (!deleteLoan) return;

    try {
      await api.delete(`/loans/${deleteLoan._id}`);
      toast.success('Loan deleted successfully');
      fetchLoans();
      setDeleteLoan(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete loan');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Loan Portfolio"
        description="Monitor active loans and track repayment status."
      >
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="gradient"
          className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={3} />
          New Loan
        </Button>
      </PageHeader>

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
              {loans.map((loan) => (
                <LoanCard
                  key={loan._id}
                  loan={loan}
                  onEdit={setEditLoan}
                  onDelete={setDeleteLoan}
                  onRefresh={fetchLoans}
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
                className="border-none bg-card/50"
              />
            )}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <LoanTable
              data={loans}
              onRefresh={fetchLoans}
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
              onDelete={(loan) => setDeleteLoan(loan)}
            />
          </div>
        )}
      </div>

      <AddLoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchLoans}
      />

      <RepayLoanModal
        isOpen={!!repayLoan}
        onClose={() => setRepayLoan(null)}
        loan={repayLoan}
        onSuccess={fetchLoans}
      />

      <LoanDetailsModal
        isOpen={!!detailLoan}
        onClose={() => setDetailLoan(null)}
        loan={detailLoan}
        onUpdate={(updatedLoan) => {
          setDetailLoan(updatedLoan);
          fetchLoans(); // Refresh list to catch any status/paidAmount changes if applicable
        }}
      />

      <EditLoanModal
        isOpen={!!editLoan}
        onClose={() => setEditLoan(null)}
        loan={editLoan}
        onSuccess={fetchLoans}
      />

      <AlertDialog open={!!deleteLoan} onOpenChange={() => setDeleteLoan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the loan for{' '}
              <strong>{deleteLoan?.customer?.name}</strong>? This will also
              delete all associated repayments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-gradient-to-r from-red-500 to-destructive text-white shadow-xl shadow-red-500/20 hover:brightness-110 hover:shadow-2xl hover:shadow-red-500/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Loans;
