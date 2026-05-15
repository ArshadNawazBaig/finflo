import { Skeleton } from '@/components/ui/skeleton';

const MemberProfileSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header (card variant) */}
    <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative bg-white dark:bg-white/[0.02] p-5 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
      <div className="flex items-center gap-4 relative z-10 max-w-2xl">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 relative">
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Skeleton className="h-3.5 w-44 rounded" />
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <Skeleton className="h-3.5 w-36 rounded" />
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <Skeleton className="h-3.5 w-40 rounded" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto relative z-10">
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="w-12 h-12 rounded-2xl" />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
          <Skeleton className="h-12 w-32 rounded-2xl" />
          <Skeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
    </div>

    {/* Stats Row */}
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 border border-slate-100 dark:border-white/[0.06]"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Skeleton className="h-2.5 w-24 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-7 w-32 rounded-xl mb-2" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
      {/* Main column */}
      <div className="lg:col-span-8 space-y-8">
        {/* Transaction Timeline */}
        <div className="rounded-[2.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded-lg" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Associated Loans */}
        <div className="rounded-[2.5rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <Skeleton className="h-5 w-44 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-32 rounded-lg" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-4 space-y-8">
        {/* Yield History (emerald gradient) */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 dark:from-emerald-500/10 dark:to-emerald-700/10 p-8 sm:p-10 rounded-[2.5rem] border border-emerald-500/10 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-11 w-11 rounded-2xl bg-emerald-500/20" />
            <Skeleton className="h-5 w-32 rounded-lg bg-emerald-500/20" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/40 dark:bg-white/[0.05] border border-emerald-500/10 flex items-center justify-between"
              >
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded bg-emerald-500/20" />
                  <Skeleton className="h-2.5 w-16 rounded bg-emerald-500/10" />
                </div>
                <Skeleton className="h-4 w-20 rounded bg-emerald-500/20" />
              </div>
            ))}
          </div>
        </div>

        {/* Professional & Identity */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-40 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-24 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[200px] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default MemberProfileSkeleton;
