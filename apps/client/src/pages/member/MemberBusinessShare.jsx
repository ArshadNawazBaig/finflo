import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  History,
  BadgeDollarSign,
  Search,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  CardsSkeleton,
  MemberInvestmentSkeleton,
  MemberInvestmentPageSkeleton,
} from '@/components/ui/PageSkeletons';
import MemberActivityCard from '@/components/member/MemberActivityCard';

const TYPE_LABELS = {
  share_deposit: 'Share Deposit',
  share_withdrawal: 'Share Withdrawal',
  share_profit: 'Share Profit',
};

const MemberBusinessShare = () => {
  const [shares, setShares] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(5);
  const [search, setSearch] = useState('');
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const observerTarget = useRef(null);
  const skipNextEffect = useRef(false);
  const isInitialMount = useRef(true);

  const fetchShares = useCallback(
    async (pageToFetch = 1, isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const memberToken = localStorage.getItem('member');
        if (!memberToken) throw new Error('Not authenticated');

        const memberData = JSON.parse(localStorage.getItem('member') || '{}');
        const memberId = memberData._id;

        if (!memberId) {
          toast.error('Could not identify member');
          return;
        }

        const [sharesRes, memberRes] = await Promise.all([
          // Members call their own share data via the member-auth me endpoint + admin route forwarded
          // We use the portal activity route with category=share if available,
          // otherwise fall back to a direct call using memberToken as Bearer
          api.get(
            `/members/portal/shares?page=${pageToFetch}&limit=${limit}&search=${search}`,
            {
              headers: {
                /* Auth header handled by browser cookies */
              },
            },
          ),
          api.get('/member-auth/me', {
            headers: {
              /* Auth header handled by browser cookies */
            },
          }),
        ]);

        const newData = sharesRes.data.shares || [];
        if (isAppend) {
          setShares((prev) => {
            const existingIds = new Set(prev.map((s) => s._id));
            return [...prev, ...newData.filter((s) => !existingIds.has(s._id))];
          });
          skipNextEffect.current = true;
        } else {
          setShares(newData);
        }

        setMember(memberRes.data);
        setTotalPages(sharesRes.data.totalPages || 0);
        setTotalEntries(sharesRes.data.total || 0);
        setCurrentPage(pageToFetch);
      } catch (error) {
        console.error('Failed to fetch business shares:', error);
        toast.error('Failed to load business share data');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, search],
  );

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchShares(currentPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isFetchingMore, currentPage, totalPages, fetchShares]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchShares(1, false);
      return;
    }
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }
    const timer = setTimeout(() => fetchShares(1, false), 500);
    return () => clearTimeout(timer);
  }, [limit, search, fetchShares]);

  const sharePercent =
    member && (member.shareBalance || 0) + (member.currentBalance || 0) > 0
      ? (
          ((member.shareBalance || 0) /
            ((member.shareBalance || 0) + (member.currentBalance || 0))) *
          100
        ).toFixed(1)
      : '0.0';

  if (loading && !member && !search) {
    return <MemberInvestmentPageSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title="Business Share"
        description="Your share of the business — invested separately from your main balance. Profits are credited here and reflected in your net earnings."
      />

      {/* Stats */}
      {loading && !member ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Share Balance"
            amount={formatCurrency(member?.shareBalance || 0)}
            icon={<Building2 size={20} />}
            color="bg-violet-500 shadow-violet-500/20"
            subtitle="Current business share value"
          />
          <StatsCard
            title="Total Share Invested"
            amount={formatCurrency(member?.totalShareInvested || 0)}
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
            subtitle="Total capital committed to shares"
          />
          <StatsCard
            title="Share Profit Earned"
            amount={formatCurrency(member?.totalShareProfit || 0)}
            icon={<BadgeDollarSign size={20} />}
            color="bg-amber-500 shadow-amber-500/20"
            subtitle="Cumulative profit from share"
          />
        </div>
      )}

      {/* Ownership indicator */}
      {member && (member.shareBalance || 0) > 0 && (
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[1.5rem] p-5 flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <PieChart />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Portfolio allocation
            </p>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white mt-1">
              {sharePercent}
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-1">
                % of total
              </span>
            </p>
          </div>
          {/* Progress bar */}
          <div className="flex-1 hidden sm:block">
            <div className="h-1.5 w-full bg-slate-200/60 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(parseFloat(sharePercent), 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-violet-500">
                Share
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Main
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share Ledger */}
      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
              <History size={11} strokeWidth={2.5} /> Ledger
            </p>
            <h2 className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              Share ledger
            </h2>
          </div>
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={14}
            />
            <Input
              type="text"
              placeholder="Search transactions..."
              className="h-auto pl-9 pr-4 py-2 bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-full text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {loading && !isFetchingMore ? (
            <MemberInvestmentSkeleton count={5} />
          ) : (
            <>
              {shares.length === 0 ? (
                <div className="p-20">
                  <EmptyState
                    icon={Building2}
                    title="No Share Transactions"
                    description="When you invest in a business share or receive share profit, it will appear here."
                  />
                </div>
              ) : (
                <>
                  <div className={cn('p-4 space-y-4', !isMobile && 'p-0')}>
                    <div
                      className={cn(
                        'grid grid-cols-1 gap-4',
                        !isMobile && 'divide-y divide-slate-100 dark:divide-white/[0.06] gap-0',
                      )}
                    >
                      {shares.map((item) => {
                        const isCredit = isCreditType(item.type, 'share');
                        const typeLabel = TYPE_LABELS[item.type] ?? item.type;
                        const accentColor =
                          item.type === 'share_profit'
                            ? 'text-amber-500'
                            : isCredit
                              ? 'text-violet-500'
                              : 'text-rose-500';
                        const chipBg =
                          item.type === 'share_profit'
                            ? 'bg-amber-500/10 text-amber-500'
                            : isCredit
                              ? 'bg-violet-500/10 text-violet-500'
                              : 'bg-rose-500/10 text-rose-500';

                        return isMobile ? (
                          <MemberActivityCard
                            key={item._id}
                            activity={{ ...item, type: item.type }}
                          />
                        ) : (
                          <div
                            key={item._id}
                            className="p-5 sm:p-6 hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                                  chipBg,
                                )}
                              >
                                {isCredit ? <ArrowUpRight /> : <ArrowDownLeft />}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm tracking-[-0.02em] capitalize text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                                  {item.description}
                                  {item.status && (
                                    <span
                                      className={cn(
                                        'text-[9px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full leading-none',
                                        item.status === 'Completed' &&
                                          'bg-emerald-500/10 text-emerald-600',
                                        item.status === 'Pending' &&
                                          'bg-amber-500/10 text-amber-600',
                                        item.status === 'Failed' &&
                                          'bg-rose-500/10 text-rose-600',
                                      )}
                                    >
                                      {item.status}
                                    </span>
                                  )}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <p
                                    className={cn(
                                      'text-[10px] font-extrabold uppercase tracking-[0.12em]',
                                      accentColor,
                                    )}
                                  >
                                    {typeLabel}
                                  </p>
                                  {item.period && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/[0.12]" />
                                      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        {item.period}
                                      </p>
                                    </>
                                  )}
                                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/[0.12]" />
                                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    {new Date(item.date).toLocaleDateString(
                                      undefined,
                                      {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                      },
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <p
                                className={cn(
                                  'text-base sm:text-lg font-extrabold tracking-tight tabular-nums',
                                  accentColor,
                                )}
                              >
                                {isCredit ? '+' : '-'}
                                {formatCurrency(item.amount)}
                              </p>
                              {item.shareBalanceAfter != null && (
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                                  Share {formatCurrency(item.shareBalanceAfter)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isMobile && currentPage < totalPages && (
                    <div ref={observerTarget} className="py-4 px-4">
                      <InfiniteLoader isFetchingMore={isFetchingMore} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {!isMobile && totalEntries > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            totalEntries={totalEntries}
            limit={limit}
            onPageChange={(page) => fetchShares(page, false)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MemberBusinessShare;
