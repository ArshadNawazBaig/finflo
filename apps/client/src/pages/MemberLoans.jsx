import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  ArrowRight,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import MemberLoanRequestModal from '@/components/MemberLoanRequestModal';
import InfiniteLoader from '@/components/InfiniteLoader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import UITooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MemberLoans = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pagination & Mobile State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(5);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const observerTarget = useRef(null);

  const fetchLoans = useCallback(
    async (isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
          setCurrentPage(1);
        } else {
          setIsFetchingMore(true);
        }

        const memberToken = localStorage.getItem('memberToken');
        const pageToFetch = isAppend ? currentPage + 1 : 1;

        const { data: response } = await api.get(
          `/loans/my-loans?page=${pageToFetch}&limit=${limit}&status=${filter === 'all' ? '' : filter}&search=${search}`,
          {
            headers: { Authorization: `Bearer ${memberToken}` },
          },
        );

        const newLoans = response.data || [];

        if (isAppend) {
          setLoans((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const filtered = newLoans.filter((l) => !existingIds.has(l._id));
            return [...prev, ...filtered];
          });
          setCurrentPage(pageToFetch);
        } else {
          setLoans(newLoans);
        }

        setTotalPages(response.totalPages || 0);
        setTotalEntries(response.totalEntries || 0);
      } catch (error) {
        console.error('Failed to fetch loans:', error);
        toast.error('Failed to load loans');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, filter, search],
  );

  useEffect(() => {
    fetchLoans();
  }, [filter, search, limit]);

  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;
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
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchLoans]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeader
          title="My Loans"
          description="View and manage all your loan requests and active agreements."
        />
        <Button
          variant="gradient"
          className="rounded-full gap-2 text-xs font-black uppercase tracking-widest px-8 py-6 shadow-xl shadow-primary/20"
          onClick={() => setIsRequestModalOpen(true)}
        >
          <Plus size={18} strokeWidth={3} /> Request New Loan
        </Button>
      </div>

      <div className="bg-card p-6 sm:p-10 rounded-[3rem] border border-border/50 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by ID or amount..."
              className="w-full pl-12 pr-4 py-3 bg-muted/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {['all', 'pending', 'active', 'completed', 'rejected'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === f
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && loans.length === 0 ? (
          <CardsSkeleton />
        ) : loans.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={FileText}
              title="No Loans Found"
              description={
                search || filter !== 'all'
                  ? "We couldn't find any loans matching your criteria."
                  : "You haven't requested any loans yet."
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loans.map((loan) => (
              <div
                key={loan._id}
                onClick={() => navigate(`/member/loans/${loan._id}`)}
                className="p-8 rounded-[2.5rem] border border-border/50 bg-card/50 hover:bg-muted/30 transition-all group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                  <FileText size={120} className="text-primary" />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                      #
                    </div>
                    <div>
                      <h4 className="font-bold text-lg tracking-tight">
                        ID: {loan._id.slice(-6).toUpperCase()}
                      </h4>
                      <p className="text-xs font-medium text-muted-foreground">
                        Issued on{' '}
                        {new Date(
                          loan.startDate || loan.createdAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      loan.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : loan.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : loan.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                            : 'bg-muted/50 text-muted-foreground border border-border/50'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Principal
                    </p>
                    <p className="text-xl font-black tracking-tighter">
                      {formatPKR(loan.principal)}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Term
                    </p>
                    <p className="text-lg font-bold">{loan.duration} Months</p>
                  </div>
                </div>

                {loan.status === 'active' && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-muted-foreground uppercase tracking-widest">
                        Repayment Progress
                      </span>
                      <span className="text-primary">
                        {Math.round(
                          100 -
                            ((loan.remainingAmount || loan.totalAmount) /
                              loan.totalAmount) *
                              100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/20">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-1000"
                        style={{
                          width: `${100 - ((loan.remainingAmount || loan.totalAmount) / loan.totalAmount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-border/30">
                  <UITooltip content="Download Full Statement">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportLoanStatement(loan, loan.repayments || []);
                      }}
                      className="p-3 bg-primary/5 text-primary rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95 border border-primary/10"
                    >
                      <Download size={18} />
                    </button>
                  </UITooltip>

                  <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                    View Details
                    <ArrowRight size={14} strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isMobile
          ? currentPage < totalPages && (
              <div ref={observerTarget}>
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )
          : loans.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalEntries={totalEntries}
                limit={limit}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  const memberToken = localStorage.getItem('memberToken');
                  api
                    .get(
                      `/loans/my-loans?page=${p}&limit=${limit}&status=${filter === 'all' ? '' : filter}&search=${search}`,
                      {
                        headers: { Authorization: `Bearer ${memberToken}` },
                      },
                    )
                    .then(({ data: response }) => {
                      setLoans(response.data || []);
                      setCurrentPage(p);
                    });
                }}
                onLimitChange={(l) => {
                  setLimit(l);
                  setCurrentPage(1);
                }}
              />
            )}
      </div>

      <MemberLoanRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => fetchLoans(false)}
      />
    </div>
  );
};

export default MemberLoans;
