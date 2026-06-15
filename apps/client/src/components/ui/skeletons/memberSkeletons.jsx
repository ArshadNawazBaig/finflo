/* eslint-disable react/prop-types -- project convention: no propTypes */
/* Member-portal page skeletons. Re-exported via ../PageSkeletons.jsx. */
import { Skeleton } from '@/components/ui/skeleton';
import { CardsSkeleton, PageHeaderSkeleton } from './sharedSkeletons';

// ─── Member Portal ──────────────────────────────────────────────────────────

export const MemberDashboardSkeleton = () => {
  // Shared header: rounded-2xl icon chip + 2-line label stack on the left,
  // small info circle on the right — matches all three real cards.
  const CardHeaderSkeleton = ({ labelW = 'w-20', subW = 'w-16' }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
        <div className="space-y-1.5">
          <Skeleton className={`h-2.5 ${labelW} rounded bg-slate-100 dark:bg-white/[0.06]`} />
          <Skeleton className={`h-3 ${subW} rounded bg-slate-100/70 dark:bg-white/[0.04]`} />
        </div>
      </div>
      <Skeleton className="h-7 w-7 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
    </div>
  );

  // Mirrors MemberFinancialSnapshot — Total Balance (lg:col-span-5):
  // header(icon + 2 labels + eye) → big number → stacked bar + legend → pills.
  const BalanceCardSkeleton = () => (
    <div className="lg:col-span-5 relative rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 flex flex-col min-h-[280px] sm:min-h-[300px] overflow-hidden">
      <div className="mb-5">
        <CardHeaderSkeleton labelW="w-24" subW="w-20" />
      </div>
      <Skeleton className="h-12 sm:h-14 w-48 rounded bg-slate-100 dark:bg-white/[0.06] mb-6" />
      <div className="mt-auto space-y-3">
        <Skeleton className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
        <div className="flex gap-4 flex-wrap">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-3 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]"
            />
          ))}
        </div>
        <div className="flex gap-2 flex-wrap pt-1">
          <Skeleton className="h-6 w-28 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
          <Skeleton className="h-6 w-24 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );

  // Active Loan / Borrowing Power (lg:col-span-4): label → outstanding number →
  // repaid progress → installment + repay button.
  const LoanCardSkeleton = () => (
    <div className="lg:col-span-4 relative rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 flex flex-col min-h-[280px] sm:min-h-[300px] overflow-hidden">
      <Skeleton className="h-2.5 w-24 rounded bg-slate-100 dark:bg-white/[0.06] mb-5" />
      <Skeleton className="h-2.5 w-20 rounded bg-slate-100/70 dark:bg-white/[0.04] mb-2" />
      <Skeleton className="h-10 sm:h-12 w-40 rounded bg-slate-100 dark:bg-white/[0.06] mb-4" />
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-2.5 w-14 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
          <Skeleton className="h-2.5 w-10 rounded bg-slate-100 dark:bg-white/[0.06]" />
        </div>
        <Skeleton className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
          <Skeleton className="h-4 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
      </div>
    </div>
  );

  // Credit Score (lg:col-span-3): icon+label → score → gauge → band pill → factor.
  const ScoreCardSkeleton = () => (
    <div className="lg:col-span-3 relative rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 flex flex-col min-h-[280px] sm:min-h-[300px] overflow-hidden">
      <div className="flex items-center gap-3 mb-5">
        <Skeleton className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
        <Skeleton className="h-2.5 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <Skeleton className="h-12 sm:h-14 w-28 rounded bg-slate-100 dark:bg-white/[0.06] mb-3" />
      <Skeleton className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] mb-4" />
      <Skeleton className="h-6 w-24 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
      <div className="mt-auto pt-4 space-y-1.5">
        <Skeleton className="h-2 w-16 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
        <Skeleton className="h-3 w-full rounded bg-slate-100/70 dark:bg-white/[0.04]" />
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-pulse pb-20">
      <PageHeaderSkeleton />
      {/* Top hero — Total Balance, Active Loan, Credit Score */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <BalanceCardSkeleton />
        <LoanCardSkeleton />
        <ScoreCardSkeleton />
      </div>

      {/* Financial Calendar — full width */}
      <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-5 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-8 w-32 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`d-${i}`} className="h-4 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={`c-${i}`} className="aspect-square rounded-xl bg-slate-100/70 dark:bg-white/[0.04]" />
          ))}
        </div>
      </div>

      {/* Quick action pills */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 min-w-[240px] h-[3.625rem] rounded-full bg-slate-100 dark:bg-white/[0.06]"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Cash Flow */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-5 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-3 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
              </div>
              <Skeleton className="h-9 w-9 rounded-full shrink-0 bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <div className="h-[300px] w-full flex items-end gap-2 sm:gap-4 lg:gap-8 px-2 sm:px-4">
              {[60, 85, 45, 92, 70, 55].map((h, i) => (
                <div key={i} className="flex-1 flex justify-center gap-1 sm:gap-2 h-full items-end pb-6 relative">
                  <div className="w-1/2 sm:w-8 bg-emerald-500/20 rounded-t-[10px]" style={{ height: `${h}%` }} />
                  <div className="w-1/2 sm:w-8 bg-rose-500/20 rounded-t-[10px]" style={{ height: `${h * 0.7}%` }} />
                  <Skeleton className="absolute bottom-0 h-3 w-8 sm:w-12 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </div>

          {/* My Loan Requests */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-5 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-3 w-52 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-16 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-9 w-32 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              </div>
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-5 sm:p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-4 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <Skeleton className="h-4 w-20 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
                      </div>
                      <Skeleton className="h-3 w-48 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                      <Skeleton className="h-1.5 w-full rounded-full mt-3 bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full shrink-0 bg-slate-100 dark:bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Saving Goals */}
        <div className="lg:col-span-1">
          <div className="sticky top-10">
            <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 rounded-[2rem] h-full space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
                  <Skeleton className="h-5 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <Skeleton className="h-9 w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] space-y-3 bg-slate-50/40 dark:bg-white/[0.02]">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28 rounded bg-slate-100 dark:bg-white/[0.06]" />
                        <Skeleton className="h-3 w-20 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                        <div className="flex gap-2 pt-1">
                           <Skeleton className="h-5 w-16 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
                           <Skeleton className="h-5 w-16 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full mt-2 bg-slate-100 dark:bg-white/[0.06]" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                      <Skeleton className="h-3 w-16 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MemberInvestmentSkeleton = ({ count = 5 }) => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.06] animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-5 sm:p-6 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06] shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-44 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2.5 w-14 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                  <Skeleton className="h-2.5 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-right shrink-0">
              <Skeleton className="h-5 w-28 rounded ml-auto bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-20 rounded ml-auto bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
          </div>
        ))}
    </div>
  );
};

export const MemberLoansSkeleton = ({ count = 4 }) => {
  return (
    <div className="p-6 sm:p-8 animate-pulse">
      {/* Mobile: single-column / Desktop: 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
          >
            {/* Header: icon chip + status badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                  <Skeleton className="h-3 w-28 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>

            {/* Principal + Term grid */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-6 w-28 rounded bg-slate-100 dark:bg-white/[0.06]" />
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Skeleton className="h-3 w-10 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-5 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3 w-8 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-white/[0.06]">
              <Skeleton className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MemberTransactionsSkeleton = ({ count = 6 }) => {
  return (
    <>
      {/* ── Mobile: cards ─── */}
      <div className="p-4 space-y-4 md:hidden animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[1.5rem] p-5"
          >
            {/* Top row: icon + desc + amount */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06] shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                  <Skeleton className="h-4 w-32 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-5 w-24 rounded ml-auto bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-2 w-12 rounded ml-auto bg-slate-100/70 dark:bg-white/[0.04]" />
              </div>
            </div>
            {/* Bottom 2-cell grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-50/40 dark:bg-white/[0.02] rounded-xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-10 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3.5 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
              </div>
              <div className="bg-slate-50/40 dark:bg-white/[0.02] rounded-xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-14 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3.5 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: flat row-list ─────────────────────── */}
      <div className="hidden md:block divide-y divide-slate-100 dark:divide-white/[0.06] animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-5 sm:p-6 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06] shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-2.5 w-16 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                  <Skeleton className="h-2.5 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-right shrink-0">
              <Skeleton className="h-5 w-28 rounded ml-auto bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-20 rounded ml-auto bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export const MemberWalletSkeleton = () => (
  <div className="space-y-10 animate-in fade-in duration-200">
    <PageHeaderSkeleton />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {/* Main Account Area */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Account Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50/40 dark:bg-white/[0.02] p-1.5 rounded-full w-fit border border-slate-100 dark:border-white/[0.06]">
          <Skeleton className="h-8 w-20 sm:w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-8 w-20 sm:w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-8 w-20 sm:w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
        </div>

        {/* Hero card */}
        <div className="flex-1 min-h-[320px] md:min-h-0 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 z-10">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32 bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-slate-100/70 dark:bg-white/[0.04]" />
              <Skeleton className="h-10 md:h-12 w-48 md:w-64 bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-32 bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mt-8 z-10">
            <div className="space-y-2 w-full sm:w-auto">
              <Skeleton className="h-3 w-20 bg-slate-100/70 dark:bg-white/[0.04]" />
              <Skeleton className="h-5 w-40 bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            {/* Hero actions: Statement (shown for current/saving — the
                default tab), My QR, Transfer. Three pills here keep the
                skeleton width steady when the real card renders. */}
            <div className="flex gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
              <Skeleton className="h-11 flex-1 sm:w-32 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-11 flex-1 sm:w-28 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-11 flex-1 sm:w-36 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Metrics — StatsCard style */}
      <div className="flex flex-col gap-6 h-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 rounded-[1.5rem] space-y-4"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-28 bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <Skeleton className="h-7 w-32 bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-3 w-20 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>

    {/* Ledger Section */}
    <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06] flex sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-5 w-32 bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-3 w-40 bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-3 w-24 hidden sm:block bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
      </div>
      <MemberInvestmentSkeleton count={5} />
    </div>
  </div>
);

export const MemberTransferSkeleton = () => (
  <div className="space-y-10 animate-in fade-in duration-200">
    <PageHeaderSkeleton />

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Transfer Controls */}
      <div className="lg:col-span-8 space-y-6">
        {/* Tabs */}
        <div className="flex p-1.5 bg-slate-50/40 dark:bg-white/[0.02] rounded-full border border-slate-100 dark:border-white/[0.06]">
          <Skeleton className="h-10 flex-1 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-10 flex-1 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] min-h-[500px] space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-6 w-48 bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-3 w-64 bg-slate-100/70 dark:bg-white/[0.04]" />
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-12 w-full rounded-2xl bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-12 w-full rounded-2xl bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
            <Skeleton className="h-12 w-full rounded-full mt-8 bg-slate-100 dark:bg-white/[0.06]" />
          </div>
        </div>
      </div>

      {/* Right Column - Balance & Summary */}
      <div className="lg:col-span-4 space-y-6">
        {/* Balance Card */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-6 sm:p-8 space-y-4">
          <Skeleton className="h-3 w-32 bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-10 w-48 bg-slate-100 dark:bg-white/[0.06]" />
          <div className="h-px bg-slate-100 dark:bg-white/[0.06] w-full my-4" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20 bg-slate-100/70 dark:bg-white/[0.04]" />
              <Skeleton className="h-3 w-16 bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24 bg-slate-100/70 dark:bg-white/[0.04]" />
              <Skeleton className="h-3 w-20 bg-slate-100 dark:bg-white/[0.06]" />
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-6 space-y-4">
          <Skeleton className="h-5 w-32 bg-slate-100 dark:bg-white/[0.06]" />
          <RecentActivityListSkeleton count={3} />
        </div>
      </div>
    </div>
  </div>
);


export const MemberCalculatorSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200 pb-20">
    <PageHeaderSkeleton />

    <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
      <div className="flex flex-col lg:flex-row animate-pulse">
        {/* Left: Inputs & Results */}
        <div className="flex-1 p-6 sm:p-8 lg:border-r border-slate-100 dark:border-white/[0.06] space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-5 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-48 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          </div>

          {/* Product chips */}
          <div>
            <Skeleton className="h-3 w-32 rounded mb-3 bg-slate-100 dark:bg-white/[0.06]" />
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              ))}
            </div>
          </div>

          {/* Interest type toggle */}
          <div className="flex gap-2 p-1 bg-slate-50/40 dark:bg-white/[0.02] rounded-full w-fit border border-slate-100 dark:border-white/[0.06]">
            <Skeleton className="h-8 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-8 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-8 w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-8 px-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                  <Skeleton className="h-5 w-16 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              </div>
            ))}
            <div className="xl:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-5 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
          </div>

          {/* Results card */}
          <div className="p-6 rounded-[1.5rem] bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 flex-1 w-full">
                <Skeleton className="h-3 w-28 rounded bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-8 w-48 rounded bg-slate-100 dark:bg-white/[0.06]" />
              </div>
              <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                  <Skeleton className="h-4 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                  <Skeleton className="h-4 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile schedule button */}
          <Skeleton className="h-12 w-full rounded-full lg:hidden bg-slate-100 dark:bg-white/[0.06]" />
        </div>

        {/* Right: Amortization Schedule — Desktop Only */}
        <div className="hidden lg:flex lg:w-[500px] xl:w-[600px] shrink-0 bg-slate-50/40 dark:bg-white/[0.02] flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-white/[0.06] space-y-1.5 animate-pulse">
            <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-5 w-40 rounded bg-slate-100 dark:bg-white/[0.06]" />
          </div>

          <div className="px-4 py-3 bg-slate-50/60 dark:bg-white/[0.03] grid grid-cols-5 gap-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-3 rounded bg-slate-100 dark:bg-white/[0.06]" />
            ))}
          </div>

          <div className="divide-y divide-slate-100/70 dark:divide-white/[0.04] animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-5 gap-3 items-center">
                <Skeleton className="h-3 w-5 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3 w-14 rounded justify-self-end bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3 w-16 rounded justify-self-end bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3 w-14 rounded justify-self-end bg-slate-100/70 dark:bg-white/[0.04]" />
                <Skeleton className="h-3 w-16 rounded justify-self-end bg-slate-100/70 dark:bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);


export const RecentActivityListSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] space-y-3"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-white/[0.06]" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
        <div className="flex justify-between items-end">
          <div className="flex gap-2">
            <Skeleton className="h-2 w-12 bg-slate-100/70 dark:bg-white/[0.04]" />
            <Skeleton className="h-2 w-16 bg-slate-100/70 dark:bg-white/[0.04]" />
          </div>
          <Skeleton className="h-4 w-24 bg-slate-100 dark:bg-white/[0.06]" />
        </div>
      </div>
    ))}
  </div>
);

export const MemberInvestmentPageSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <PageHeaderSkeleton />
    <CardsSkeleton count={3} />
    <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
        <Skeleton className="h-10 w-64 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
        <Skeleton className="h-10 w-32 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <MemberInvestmentSkeleton count={5} />
    </div>
  </div>
);

export const MemberLoansPageSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <PageHeaderSkeleton />
    </div>
    <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Skeleton className="h-11 w-full max-w-md rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
      <MemberLoansSkeleton count={4} />
    </div>
  </div>
);

export const MemberLoanDetailSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 w-full">
        <Skeleton className="w-10 h-10 rounded-full shrink-0 bg-slate-100 dark:bg-white/[0.06]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-7 w-48 rounded bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-3 w-64 rounded hidden sm:block bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
      </div>
      <Skeleton className="h-11 w-full sm:w-32 rounded-full shrink-0 bg-slate-100 dark:bg-white/[0.06]" />
    </div>
    <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] h-[280px] w-full" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-[1.5rem] p-5 border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <Skeleton className="h-3 w-20 rounded bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-8 w-8 rounded-full shrink-0 bg-slate-100 dark:bg-white/[0.06]" />
          </div>
          <Skeleton className="h-7 w-28 rounded mb-3 bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-3 w-20 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
      ))}
    </div>
    <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] h-[500px] w-full" />
  </div>
);

export const MemberActivityPageSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <PageHeaderSkeleton />
    <CardsSkeleton count={3} />
    <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex gap-4 flex-1">
            <Skeleton className="h-11 flex-1 max-w-md rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-11 w-48 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </div>
      <MemberTransactionsSkeleton count={6} />
    </div>
  </div>
);

export const MemberNotificationsPageSkeleton = () => (
  <div className="space-y-6 animate-pulse pb-10">
    <PageHeaderSkeleton />
    <div className="flex flex-col md:flex-row gap-4">
      <Skeleton className="h-12 flex-1 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
      <Skeleton className="h-12 w-[180px] rounded-full bg-slate-100 dark:bg-white/[0.06]" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] flex items-start gap-4"
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0 bg-slate-100 dark:bg-white/[0.06]" />
          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/3 rounded bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-20 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
            </div>
            <Skeleton className="h-3 w-full rounded bg-slate-100/70 dark:bg-white/[0.04]" />
            <Skeleton className="h-3 w-2/3 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
