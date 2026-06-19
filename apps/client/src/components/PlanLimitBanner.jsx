import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { subscriptionAtom, userAtom } from '@/atoms';
import { Button } from '@/components/ui/button';

// Singular / plural noun per metric, so "1 of 1 branch" reads correctly.
const METRIC_LABEL = {
  branches: ['branch', 'branches'],
  members: ['member', 'members'],
  loans: ['loan', 'loans'],
};

const PlanLimitBanner = () => {
  const sub = useAtomValue(subscriptionAtom);
  const user = useAtomValue(userAtom);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  if (sub.loading || !user || (!isAdmin && !isStaff) || sub.plan === 'Pro') {
    return null;
  }

  const limits = {
    loans: sub.limits?.loans ?? (sub.plan === 'Basic' ? 50 : 5),
    members: sub.limits?.members ?? (sub.plan === 'Basic' ? 3 : 1),
    branches: sub.limits?.branches ?? (sub.plan === 'Basic' ? 3 : 1),
  };

  // Build a metric list and surface the single MOST-constrained one, so the
  // heading ("reached" vs "approaching") always matches the metric shown.
  const metrics = [
    { key: 'branches', count: sub.usage?.branches || 0, limit: limits.branches },
    { key: 'members', count: sub.usage?.members || 0, limit: limits.members },
    { key: 'loans', count: sub.usage?.loans || 0, limit: limits.loans },
  ].map((m) => ({
    ...m,
    pct: Math.min(100, (m.count / (m.limit || 1)) * 100),
  }));

  const top = metrics.reduce((a, b) => (b.pct > a.pct ? b : a));
  if (top.pct < 80) return null;

  const isAtLimit = top.pct >= 100;
  const noun = METRIC_LABEL[top.key][top.limit === 1 ? 0 : 1];
  const Icon = isAtLimit ? AlertTriangle : TrendingUp;

  return (
    <div className="mb-8 shrink-0 overflow-hidden rounded-[2rem] border border-amber-500/20 bg-amber-500/[0.06] dark:bg-amber-500/[0.04] p-5 sm:p-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        {/* Left — icon + copy + progress */}
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 [&_svg]:h-5 [&_svg]:w-5">
            <Icon strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600/80 dark:text-amber-400/80">
              {sub.plan} plan
            </p>
            <h3 className="mt-0.5 text-base font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
              {isAtLimit ? 'Plan limit reached' : 'Approaching your plan limit'}
            </h3>
            <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              You&apos;re using{' '}
              <strong className="font-bold text-slate-700 dark:text-slate-200">
                {top.count} of {top.limit}
              </strong>{' '}
              {noun}.{' '}
              {isAtLimit
                ? `Upgrade to add more ${METRIC_LABEL[top.key][1]}.`
                : 'Consider upgrading soon to avoid interruptions.'}
            </p>

            {/* Progress */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-amber-500/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
                  style={{ width: `${top.pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-400">
                {Math.round(top.pct)}%
              </span>
            </div>
          </div>
        </div>

        {/* Right — action */}
        {isAdmin ? (
          <Button
            onClick={() => navigate('/billing')}
            variant="gradient"
            className="h-11 w-full shrink-0 gap-1.5 rounded-full px-6 text-[11px] font-black uppercase tracking-widest sm:w-auto"
          >
            Upgrade now
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        ) : (
          <p className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Ask your admin to upgrade
          </p>
        )}
      </div>
    </div>
  );
};

export default PlanLimitBanner;
