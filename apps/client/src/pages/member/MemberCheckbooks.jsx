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

  const getStatusClasses = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'used':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

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
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/5 rounded-2xl border border-primary/10">
                <BadgeDollarSign size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  Checkbook Pricing
                </h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Fee varies based on number of leaves
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[25, 50, 100].map((leaves) => {
                const meta = LEAF_META[leaves];
                return (
                  <div
                    key={leaves}
                    className={cn(
                      'relative p-8 rounded-[2.5rem] border shadow-sm transition-all duration-500 group',
                      meta.bg,
                    )}
                  >
                    {/* Popular badge */}
                    {meta.popular && (
                      <div
                        className={cn(
                          'absolute top-6 right-6 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-white bg-gradient-to-r',
                          meta.gradient,
                        )}
                      >
                        Popular
                      </div>
                    )}

                    {/* Background glow */}
                    <div
                      className={cn(
                        'absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 bg-gradient-to-br',
                        meta.gradient,
                      )}
                    />

                    <div className="relative z-10 space-y-5">
                      <div
                        className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center',
                          meta.iconBg,
                        )}
                      >
                        <BookOpen size={24} />
                      </div>

                      <div>
                        <h3 className="text-xl font-black tracking-tight">
                          {meta.label}
                        </h3>
                        <p className="text-xs font-medium text-muted-foreground mt-1">
                          {meta.description}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black tracking-tighter">
                          {formatCurrency(fees[leaves])}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          / book
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <Layers size={14} />
                        <span>{leaves} Leaves</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkbook History */}
          <div className="bg-card rounded-[3rem] border border-border/50 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
                  <BookOpen size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-md sm:text-xl font-black tracking-tight uppercase">
                    My Checkbooks
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                    {totalEntries} total checkbook
                    {totalEntries !== 1 ? 's' : ''} issued
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchCheckbooks(1, false)}
                className={cn(
                  'h-10 w-10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all active:rotate-180 duration-500',
                  loading && 'animate-spin cursor-not-allowed',
                )}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw size={18} />
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
                  'divide-y divide-border/40',
                  isMobile && 'p-4 space-y-4 divide-y-0',
                )}
              >
                {checkbooks.map((cb) => (
                  <div
                    key={cb._id}
                    className={cn(
                      'group transition-all',
                      isMobile
                        ? 'p-6 rounded-[2rem] border border-border/50 bg-card shadow-sm hover:shadow-md'
                        : 'p-6 sm:p-8 hover:bg-muted/30',
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-5 flex-1 min-w-0">
                        <div
                          className={cn(
                            'p-4 rounded-2xl border shadow-sm shrink-0 group-hover:scale-110 transition-transform',
                            cb.status === 'active'
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600'
                              : cb.status === 'cancelled'
                                ? 'bg-rose-500/5 border-rose-500/10 text-rose-500'
                                : 'bg-blue-500/5 border-blue-500/10 text-blue-600',
                          )}
                        >
                          <BookOpen size={20} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-black text-lg tracking-tight">
                              {cb.checkbookNumber}
                            </h4>
                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border',
                                getStatusClasses(cb.status),
                              )}
                            >
                              {cb.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Layers size={12} className="text-primary/60" />
                              <span>{cb.numberOfLeaves} Leaves</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <BadgeDollarSign
                                size={12}
                                className="text-primary/60"
                              />
                              <span>Fee: {formatCurrency(cb.fee)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Calendar size={12} className="text-primary/60" />
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

                          {cb.notes && (
                            <p className="text-[10px] text-muted-foreground/60 mt-2 italic font-medium truncate max-w-xs">
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
                          size={18}
                          className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0"
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
