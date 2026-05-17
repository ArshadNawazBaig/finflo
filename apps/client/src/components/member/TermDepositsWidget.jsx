import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, TrendingUp, ArrowUpRight, Clock } from 'lucide-react';
import api from '@/lib/axios';
import { cn, formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const formatMaturity = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.round((d - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Ready';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 30) return `${diff}d`;
  if (diff < 365) return `${Math.round(diff / 30)}mo`;
  return `${Math.round(diff / 365)}y`;
};

const TermDepositsWidget = () => {
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/term-deposits/portal/my-deposits')
      .then(({ data }) => {
        if (!cancelled) setDeposits(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setDeposits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = deposits.filter((d) => d.status === 'active');
  const totalLocked = active.reduce((sum, d) => sum + (d.principal || 0), 0);
  const totalProfit = active.reduce(
    (sum, d) => sum + (d.projectedProfit || 0),
    0,
  );
  const nextToMature = [...active]
    .sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate))
    .slice(0, 2);

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.02] p-6 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28 rounded bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-7 w-16 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
        <Skeleton className="h-10 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-2xl bg-slate-100/70 dark:bg-white/[0.04]" />
          <Skeleton className="h-12 w-full rounded-2xl bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.02] p-6 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
            <Lock size={10} strokeWidth={2.5} /> Term deposits
          </p>
          <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            Locked savings
          </h3>
        </div>
        <Link
          to="/member/term-deposits"
          aria-label="Open term deposits"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 hover:text-primary hover:bg-primary/10 transition-all group"
        >
          <ArrowUpRight
            size={13}
            strokeWidth={2.5}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </div>

      {active.length === 0 ? (
        // Empty-state nudge — no current TDs.
        <Link
          to="/member/term-deposits"
          className="block group p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors"
        >
          <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
            Lock funds for guaranteed profit
          </p>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Choose a tenor (3–24 months) and earn a fixed rate. Open your first
            term deposit →
          </p>
        </Link>
      ) : (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                Locked
              </p>
              <p className="text-lg font-extrabold tracking-[-0.025em] tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(totalLocked)}
              </p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {active.length} active
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <TrendingUp size={9} strokeWidth={2.5} className="text-emerald-500" />
                Projected
              </p>
              <p className="text-lg font-extrabold tracking-[-0.025em] tabular-nums text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(totalProfit)}
              </p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                at maturity
              </p>
            </div>
          </div>

          {/* Next maturities */}
          {nextToMature.length > 0 && (
            <div className="space-y-2">
              {nextToMature.map((td) => (
                <Link
                  key={td._id}
                  to="/member/term-deposits"
                  className={cn(
                    'flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors',
                    'border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]',
                    'hover:bg-white dark:hover:bg-white/[0.04]',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold tracking-tight truncate text-slate-900 dark:text-white">
                      {formatCurrency(td.principal)}{' '}
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em]">
                        · {td.duration}mo @ {td.profitRate}%
                      </span>
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={9} strokeWidth={2.5} />
                      Matures{' '}
                      {new Date(td.maturityDate).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] bg-emerald-500/10 text-emerald-600">
                    {formatMaturity(td.maturityDate)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TermDepositsWidget;
