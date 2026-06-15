import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Hash,
  Layers,
  Calendar,
  BadgeDollarSign,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import { cn, formatCurrency, capitalize } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MemberInvestmentPageSkeleton } from '@/components/ui/PageSkeletons';

const LEAF_META = {
  25: {
    label: 'Standard',
    description: '25 leaves — ideal for everyday use',
    gradient: 'from-sky-500 to-blue-600',
    bg: 'bg-sky-500/5 border-sky-500/10 hover:border-sky-500/30',
    iconBg: 'bg-sky-500/10 text-sky-600',
    ring: 'ring-sky-500/20',
  },
  50: {
    label: 'Professional',
    description: '50 leaves — extended transactions',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/5 border-violet-500/10 hover:border-violet-500/30',
    iconBg: 'bg-violet-500/10 text-violet-600',
    ring: 'ring-violet-500/20',
    popular: true,
  },
  100: {
    label: 'Enterprise',
    description: '100 leaves — maximum capacity',
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30',
    iconBg: 'bg-amber-500/10 text-amber-600',
    ring: 'ring-amber-500/20',
  },
};

const MemberCheckbooks = () => {
  const [checkbooks, setCheckbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState({ 25: 0, 50: 0, 100: 0 });
  const [currency, setCurrency] = useState('Rs.');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1024px)');
  const observerTarget = useRef(null);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  // Fetch business config (fees)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get(
          '/system-settings/member-business-config',
        );
        if (data?.checkbookFees) {
          setFees({
            25: data.checkbookFees[25] ?? 0,
            50: data.checkbookFees[50] ?? 0,
            100: data.checkbookFees[100] ?? 0,
          });
        }
        if (data?.currency) setCurrency(data.currency);
      } catch {
        // Fail silently – pricing cards will show 0
      }
    };
    fetchConfig();
  }, []);

  // Fetch checkbooks
  const fetchCheckbooks = useCallback(
    async (pageToFetch = 1, isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const { data } = await api.get(
          `/checkbooks/portal?page=${pageToFetch}&limit=${limit}`,
        );

        const newData = data.checkbooks || [];

        if (isAppend) {
          setCheckbooks((prev) => {
            const existingIds = new Set(prev.map((c) => c._id));
            return [...prev, ...newData.filter((c) => !existingIds.has(c._id))];
          });
        } else {
          setCheckbooks(newData);
        }

        setTotalPages(data.totalPages || 0);
        setTotalEntries(data.total || 0);
        setCurrentPage(pageToFetch);
      } catch {
        toast.error('Failed to load checkbooks');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchCheckbooks(1, false);
  }, [fetchCheckbooks]);

  // Infinite scroll observer
  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchCheckbooks(currentPage + 1, true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchCheckbooks]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title={
          <>
            My <span className="text-primary">Checkbooks</span>
          </>
        }
        description="View your issued checkbooks and checkbook pricing."
      />

      {loading && checkbooks.length === 0 ? (
        <MemberInvestmentPageSkeleton />
      ) : (
        <>
          {/* Pricing Cards */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Pricing
              </p>
              <h2 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
                Checkbook pricing
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                Fee varies based on number of leaves
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {[25, 50, 100].map((leaves) => {
                const meta = LEAF_META[leaves];
                return (
                  <div
                    key={leaves}
                    className="group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)] border border-slate-100 dark:border-white/[0.06]"
                  >
                    {/* Popular badge */}
                    {meta.popular && (
                      <span className="absolute top-5 right-5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] bg-primary/10 text-primary">
                        Popular
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5', meta.iconBg)}>
                        <BookOpen />
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                          {meta.label}
                        </p>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                          {meta.description}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(fees[leaves])}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          / book
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <Layers size={12} className="text-primary/60" />
                        <span className="tabular-nums">{leaves} leaves</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkbook History */}
          <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Issued
                </p>
                <h2 className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  My checkbooks
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {totalEntries} total checkbook
                  {totalEntries !== 1 ? 's' : ''} issued
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchCheckbooks(1, false)}
                className={cn(
                  'h-9 w-9 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-500',
                  loading && 'animate-spin cursor-not-allowed',
                )}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw size={14} strokeWidth={2.5} />
              </Button>
            </div>

            {checkbooks.length === 0 ? (
              <div className="p-20">
                <EmptyState
                  icon={BookOpen}
                  title="No Checkbooks Issued"
                  description="You don't have any checkbooks yet. Contact your admin to request a checkbook."
                />
              </div>
            ) : (
              <div
                className={cn(
                  'divide-y divide-slate-100 dark:divide-white/[0.06]',
                  isMobile && 'p-4 space-y-4 divide-y-0',
                )}
              >
                {checkbooks.map((cb) => (
                  <div
                    key={cb._id}
                    className={cn(
                      'group transition-all',
                      isMobile
                        ? 'p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]'
                        : 'p-5 sm:p-6 hover:bg-slate-50/40 dark:hover:bg-white/[0.02]',
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                            cb.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : cb.status === 'cancelled'
                                ? 'bg-rose-500/10 text-rose-500'
                                : 'bg-blue-500/10 text-blue-500',
                          )}
                        >
                          <BookOpen />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm tracking-[-0.02em] text-slate-900 dark:text-white tabular-nums">
                              {cb.checkbookNumber}
                            </h4>
                            <StatusBadge
                              status={cb.status}
                              tone={cb.status === 'used' ? 'info' : undefined}
                            />
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              <Layers size={11} className="text-primary/60" />
                              <span className="tabular-nums">
                                {cb.numberOfLeaves - (cb.usedLeaves || 0)} / {cb.numberOfLeaves} leaves
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              <BadgeDollarSign
                                size={11}
                                className="text-primary/60"
                              />
                              <span className="tabular-nums">{formatCurrency(cb.fee)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              <Calendar size={11} className="text-primary/60" />
                              <span>
                                {new Date(cb.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  },
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Leaf usage progress bar */}
                          {cb.status === 'active' && (
                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                                  Leaf usage
                                </span>
                                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                                  {cb.usedLeaves || 0} / {cb.numberOfLeaves}
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-700',
                                    ((cb.usedLeaves || 0) / cb.numberOfLeaves) >= 0.9
                                      ? 'bg-rose-500'
                                      : ((cb.usedLeaves || 0) / cb.numberOfLeaves) >= 0.6
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500',
                                  )}
                                  style={{
                                    width: `${Math.min(100, ((cb.usedLeaves || 0) / cb.numberOfLeaves) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {cb.notes && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 italic font-medium truncate max-w-xs">
                              {cb.notes}
                            </p>
                          )}

                          {cb.status === 'cancelled' && cb.cancelledAt && (
                            <p className="text-[10px] text-rose-500/70 mt-1 font-bold">
                              Cancelled on{' '}
                              {new Date(cb.cancelledAt).toLocaleDateString()}{' '}
                              {cb.refunded && '(Refunded)'}
                            </p>
                          )}
                        </div>
                      </div>

                      {!isMobile && (
                        <ChevronRight
                          size={16}
                          className="text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isMobile && currentPage < totalPages && (
              <div ref={observerTarget} className="py-4 px-4">
                <InfiniteLoader isFetchingMore={isFetchingMore} />
              </div>
            )}

            {!isMobile && totalEntries > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages || 1}
                totalEntries={totalEntries}
                limit={limit}
                onPageChange={(page) => fetchCheckbooks(page, false)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MemberCheckbooks;
