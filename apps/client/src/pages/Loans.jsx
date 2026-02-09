import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import PageHeader from '@/components/PageHeader';
import AddLoanModal from '@/components/AddLoanModal';
import RepayLoanModal from '@/components/RepayLoanModal';
import LoanDetailsModal from '@/components/LoanDetailsModal';
import EditLoanModal from '@/components/EditLoanModal';
import TableSkeleton from '@/components/TableSkeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/loans?page=${currentPage}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      );
      setLoans(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Failed to fetch loans', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, sortBy, sortOrder]);

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
      fetchLoans();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchLoans]);

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
        title="Loans"
        description="Monitor active loans and track repayment status."
      >
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md hover:shadow-lg hover:brightness-110 px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={3} />
          New Loan
        </button>
      </PageHeader>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search loans..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <LoanTable
              data={loans}
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
