import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { memberAtom } from '@/atoms';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  ArrowRight,
  Download,
  Search,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/PageHeader';
import MemberLoanRequestModal from '@/components/member/MemberLoanRequestModal';
import MemberLoanRenewalModal from '@/components/member/MemberLoanRenewalModal';
import { MemberLoansSkeleton, MemberLoansPageSkeleton } from '@/components/ui/PageSkeletons';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import UITooltip from '@/components/ui/Tooltip';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import InfiniteLoader from '@/components/InfiniteLoader';
import Pagination from '@/components/ui/Pagination';

const MemberLoans = () => {
  const navigate = useNavigate();
  const member = useAtomValue(memberAtom);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [renewalLoan, setRenewalLoan] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pagination & Mobile State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchLoans = useCallback(
    async (pageToFetch = 1, isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
        } else {
          setIsFetchingMore(true);
        }

        if (!member) throw new Error('Not authenticated');

        const { data: response } = await api.get(
          `/loans/my-loans?page=${pageToFetch}&limit=${limit}&status=${filter === 'all' ? '' : filter}&search=${search}`,
          {
            headers: {
              /* Auth header handled by browser cookies */
            },
          },
        );

        const newLoans = response.data || [];

        if (isAppend) {
          setLoans((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const filtered = newLoans.filter((l) => !existingIds.has(l._id));
            return [...prev, ...filtered];
          });
        } else {
          setLoans(newLoans);
        }

        setTotalPages(response.totalPages || 0);
        setTotalEntries(response.totalEntries || 0);
        if (isAppend) skipNextEffect.current = true;
        setCurrentPage(pageToFetch);
      } catch (error) {
        console.error('Failed to fetch loans:', error);
        toast.error('Failed to load loans');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [filter, search, limit],
  );

  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }
    fetchLoans(1, false);
  }, [filter, search, limit, fetchLoans]);

  useEffect(() => {
    if (!observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          !loading &&
          currentPage < totalPages
        ) {
          fetchLoans(currentPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isFetchingMore, loading, currentPage, totalPages, fetchLoans]);

  if (loading && loans.length === 0 && filter === 'all' && !search) {
    return <MemberLoansPageSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <PageHeader
          title="My Loans"
          description="View and manage all your loan requests and active agreements."
        />
        <Button
          onClick={() => setIsRequestModalOpen(true)}
          className="group inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full md:w-auto"
        >
          <Plus size={14} strokeWidth={2.5} /> New loan
          <span className="ml-0.5 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
            <ArrowRight size={12} strokeWidth={3} />
          </span>
        </Button>
      </div>

      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <Input
                type="text"
                placeholder="Search by ID or amount..."
                className="h-auto pl-11 pr-4 py-3 bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-full font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {['all', 'pending', 'active', 'completed', 'renewed', 'rejected'].map(
                (f) => (
                  <Button
                    variant="ghost"
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-4 py-2 rounded-full text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all whitespace-nowrap',
                      filter === f
                        ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                    )}
                  >
                    {f}
                  </Button>
                ),
              )}
            </div>
          </div>
        </div>

        <div>
          {loading && !isFetchingMore ? (
            <MemberLoansSkeleton count={4} />
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
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {loans.map((loan) => (
                <div
                  key={loan._id}
                  onClick={() => navigate(`/member/loans/${loan._id}`)}
                  className="p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50/40 dark:hover:bg-white/[0.04] transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary [&_svg]:w-3.5 [&_svg]:h-3.5">
                        <FileText />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                          Loan ID
                        </p>
                        <h4 className="font-extrabold text-sm tracking-[-0.02em] text-slate-900 dark:text-white tabular-nums">
                          #{loan._id.slice(-6).toUpperCase()}
                        </h4>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em]',
                        loan.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : loan.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600'
                            : loan.status === 'completed'
                              ? 'bg-blue-500/10 text-blue-600'
                              : loan.status === 'renewed'
                                ? 'bg-indigo-500/10 text-indigo-600'
                                : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400',
                      )}
                    >
                      {loan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Principal
                      </p>
                      <p className="text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(loan.principal)}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Term
                      </p>
                      <p className="text-base font-extrabold tabular-nums text-slate-700 dark:text-slate-200">
                        {loan.duration} mo
                      </p>
                    </div>
                  </div>

                  {loan.status === 'active' && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] text-[10px]">
                          Repayment
                        </span>
                        <span className="text-primary tabular-nums font-extrabold">
                          {Math.round(
                            100 -
                              ((loan.remainingAmount || loan.totalAmount) /
                                loan.totalAmount) *
                                100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{
                            width: `${100 - ((loan.remainingAmount || loan.totalAmount) / loan.totalAmount) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5">
                        Issued{' '}
                        <span className="font-extrabold text-slate-700 dark:text-slate-300">
                          {new Date(
                            loan.startDate || loan.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <UITooltip content="Download Full Statement">
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            exportLoanStatement(loan, loan.repayments || []);
                          }}
                          className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all active:scale-95 [&_svg]:w-3.5 [&_svg]:h-3.5"
                        >
                          <Download />
                        </Button>
                      </UITooltip>
                      {['active', 'overdue', 'completed'].includes(
                        loan.status,
                      ) && (
                        <UITooltip content="Request Renewal">
                          <Button
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenewalLoan(loan);
                            }}
                            className="h-9 w-9 flex items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 [&_svg]:w-3.5 [&_svg]:h-3.5"
                          >
                            <RotateCw />
                          </Button>
                        </UITooltip>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-primary font-extrabold text-[10px] uppercase tracking-[0.15em] group-hover:translate-x-0.5 transition-transform">
                      View
                      <ArrowRight size={12} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
              {/* Infinite Scroll Trigger */}
              {isMobile && currentPage < totalPages && (
                <div ref={observerTarget} className="py-4">
                  <InfiniteLoader isFetchingMore={isFetchingMore} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Pagination */}
        {!isMobile && totalEntries > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            totalEntries={totalEntries}
            limit={limit}
            onPageChange={(page) => fetchLoans(page, false)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
              fetchLoans(1, false);
            }}
          />
        )}
      </div>

      <MemberLoanRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => fetchLoans(false)}
      />

      <MemberLoanRenewalModal
        isOpen={!!renewalLoan}
        loan={renewalLoan}
        onClose={() => setRenewalLoan(null)}
        onSuccess={() => fetchLoans(1, false)}
      />
    </div>
  );
};

export default MemberLoans;
