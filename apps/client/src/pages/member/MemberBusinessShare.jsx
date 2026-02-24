import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  History,
  Loader2,
  BadgeDollarSign,
  Search,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import MemberInvestmentSkeleton from '@/components/member/MemberInvestmentSkeleton';
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

        const memberToken = localStorage.getItem('memberToken');
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
              headers: { Authorization: `Bearer ${memberToken}` },
            },
          ),
          api.get('/member-auth/me', {
            headers: { Authorization: `Bearer ${memberToken}` },
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
            amount={formatPKR(member?.shareBalance || 0)}
            icon={<Building2 size={20} />}
            color="bg-violet-500 shadow-violet-500/20"
            subtitle="Current business share value"
          />
          <StatsCard
            title="Total Share Invested"
            amount={formatPKR(member?.totalShareInvested || 0)}
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
            subtitle="Total capital committed to shares"
          />
          <StatsCard
            title="Share Profit Earned"
            amount={formatPKR(member?.totalShareProfit || 0)}
            icon={<BadgeDollarSign size={20} />}
            color="bg-amber-500 shadow-amber-500/20"
            subtitle="Cumulative profit from share"
          />
        </div>
      )}

      {/* Ownership indicator */}
      {member && (member.shareBalance || 0) > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-500">
            <PieChart size={22} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Portfolio Allocation
            </p>
            <p className="text-2xl font-black tracking-tight mt-1">
              {sharePercent}
              <span className="text-base font-bold text-muted-foreground ml-1">
                % of total
              </span>
            </p>
          </div>
          {/* Progress bar */}
          <div className="flex-1 hidden sm:block">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(parseFloat(sharePercent), 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-[10px] font-bold text-violet-500">
                Share Balance
              </p>
              <p className="text-[10px] font-bold text-muted-foreground">
                Main Balance
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share Ledger */}
      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-xl">
              <History size={20} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Share Ledger</h2>
          </div>
          <div className="relative w-full max-w-xs hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border/50 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-border/40">
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
                        !isMobile && 'divide-y divide-border/40 gap-0',
                      )}
                    >
                      {shares.map((item) => {
                        const isCredit =
                          item.type === 'share_deposit' ||
                          item.type === 'share_profit';
                        const typeLabel = TYPE_LABELS[item.type] ?? item.type;
                        const accentColor =
                          item.type === 'share_profit'
                            ? 'text-amber-500'
                            : isCredit
                              ? 'text-violet-500'
                              : 'text-rose-500';

                        return isMobile ? (
                          <MemberActivityCard
                            key={item._id}
                            activity={{ ...item, type: item.type }}
                          />
                        ) : (
                          <div
                            key={item._id}
                            className="p-6 sm:p-8 hover:bg-muted/30 transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-5">
                              <div
                                className={`p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:scale-110 transition-transform ${accentColor}`}
                              >
                                {isCredit ? (
                                  <ArrowUpRight size={18} />
                                ) : (
                                  <ArrowDownLeft size={18} />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg tracking-tight capitalize">
                                  {item.description}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <p
                                    className={`text-[10px] font-black uppercase tracking-widest ${accentColor}`}
                                  >
                                    {typeLabel}
                                  </p>
                                  {item.period && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {item.period}
                                      </p>
                                    </>
                                  )}
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
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
                                className={`text-xl font-black tracking-tighter ${accentColor}`}
                              >
                                {isCredit ? '+' : '-'}
                                {formatPKR(item.amount)}
                              </p>
                              {item.shareBalanceAfter != null && (
                                <p className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">
                                  Share: {formatPKR(item.shareBalanceAfter)}
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
