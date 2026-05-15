import { Skeleton } from '@/components/ui/skeleton';

const LoanDetailSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200 pb-12">
    {/* Page Header (card variant) */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative bg-white dark:bg-white/[0.02] p-5 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
      <div className="flex items-center gap-4 relative z-10 max-w-2xl">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 relative">
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Skeleton className="h-3.5 w-32 rounded" />
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <Skeleton className="h-3.5 w-36 rounded" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-end relative z-10">
        <Skeleton className="h-12 w-28 rounded-2xl" />
        <Skeleton className="h-12 w-32 rounded-full" />
      </div>
    </div>

    {/* Stats Row */}
    <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 border border-slate-100 dark:border-white/[0.06]"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Skeleton className="h-2.5 w-28 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-7 w-32 rounded-xl mb-2" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>

    {/* Repayment Calendar */}
    <div className="w-full rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] space-y-2"
          >
            <Skeleton className="h-2.5 w-12 rounded-full" />
            <Skeleton className="h-5 w-10 rounded" />
            <Skeleton className="h-3 w-full rounded" />
          </div>
        ))}
      </div>
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main column - Repayment Ledger */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-10 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-3 w-72 rounded" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
              >
                <div className="flex items-center gap-5">
                  <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-4 space-y-8">
        {/* AI Risk Engine */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 sm:p-8 rounded-[2.5rem] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-4 w-full rounded" />
          </div>
          <div className="space-y-2.5 pt-2 border-t border-emerald-500/10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" />
                <Skeleton className="h-3 w-full max-w-[220px] rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Agreement Parameters */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-40 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Settlement Analysis */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-8 rounded-[2rem] space-y-6 sm:space-y-8 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <Skeleton className="h-6 w-44 rounded-lg" />
          </div>
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-32 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <Skeleton className="h-2.5 w-32 rounded-full" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
            <div className="p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-40 rounded" />
                <Skeleton className="h-3 w-full max-w-[180px] rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default LoanDetailSkeleton;
