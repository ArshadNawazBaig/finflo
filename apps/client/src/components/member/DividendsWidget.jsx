import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { TrendingUp, ArrowUpRight, PieChart } from 'lucide-react';
import { memberAtom } from '@/atoms';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const DividendsWidget = () => {
  const member = useAtomValue(memberAtom);
  const [loading, setLoading] = useState(true);
  const [recentDividends, setRecentDividends] = useState([]);

  // Only show this widget if the member has any share activity at all —
  // members with no shareholdings shouldn't see an empty card.
  const hasShares =
    (member?.shareBalance || 0) > 0 ||
    (member?.totalShareInvested || 0) > 0 ||
    (member?.totalShareProfit || 0) > 0;

  useEffect(() => {
    if (!hasShares) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get('/members/portal/shares?page=1&limit=10')
      .then(({ data }) => {
        if (cancelled) return;
        const shares = data?.shares || [];
        const profits = shares
          .filter((s) => s.type === 'share_profit')
          .slice(0, 2);
        setRecentDividends(profits);
      })
      .catch(() => {
        if (!cancelled) setRecentDividends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasShares]);

  if (!hasShares) return null;

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.02] p-6 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-7 w-7 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
        <Skeleton className="h-10 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
        <Skeleton className="h-12 w-full rounded-2xl bg-slate-100/70 dark:bg-white/[0.04]" />
      </div>
    );
  }

  const totalEarned = member?.totalShareProfit || 0;
  const shareBalance = member?.shareBalance || 0;

  return (
    <div className="bg-white dark:bg-white/[0.02] p-6 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
            <PieChart size={10} strokeWidth={2.5} /> Share dividends
          </p>
          <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            Returns earned
          </h3>
        </div>
        <Link
          to="/member/shares"
          aria-label="Open share history"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 hover:text-primary hover:bg-primary/10 transition-all group"
        >
          <ArrowUpRight
            size={13}
            strokeWidth={2.5}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <TrendingUp size={9} strokeWidth={2.5} className="text-emerald-500" />
            Total earned
          </p>
          <p className="text-lg font-extrabold tracking-[-0.025em] tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(totalEarned)}
          </p>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            all-time
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Share balance
          </p>
          <p className="text-lg font-extrabold tracking-[-0.025em] tabular-nums text-slate-900 dark:text-white">
            {formatCurrency(shareBalance)}
          </p>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            current
          </p>
        </div>
      </div>

      {/* Recent dividends */}
      {recentDividends.length > 0 ? (
        <div className="space-y-2">
          {recentDividends.map((d) => (
            <Link
              key={d._id}
              to="/member/shares"
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold tracking-tight truncate text-slate-900 dark:text-white">
                  +{formatCurrency(d.amount)}
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {d.period ||
                    new Date(d.date).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })}
                </p>
              </div>
              <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] bg-emerald-500/10 text-emerald-600">
                Dividend
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic">
          No dividends distributed yet. Returns appear here when declared.
        </p>
      )}
    </div>
  );
};

export default DividendsWidget;
