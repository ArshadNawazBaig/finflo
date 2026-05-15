import { Skeleton } from '@/components/ui/skeleton';

const CustomerProfileSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header (card variant) */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative bg-white dark:bg-white/[0.02] p-5 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
      <div className="flex items-center gap-4 relative z-10 max-w-2xl">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2 relative">
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-3.5 w-40 rounded" />
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <Skeleton className="h-3.5 w-32 rounded" />
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <Skeleton className="h-3.5 w-48 rounded" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <Skeleton className="h-12 w-28 rounded-2xl" />
        <Skeleton className="h-12 w-28 rounded-full" />
        <Skeleton className="h-12 w-28 rounded-full" />
      </div>
    </div>

    {/* Stats Row */}
    <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 border border-slate-100 dark:border-white/[0.06]"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <Skeleton className="h-2.5 w-28 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-7 w-32 rounded-xl mb-2" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>

    {/* Tabs */}
    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.06] pb-1 overflow-x-auto mb-6">
      <Skeleton className="h-10 w-44 rounded" />
      <Skeleton className="h-10 w-44 rounded" />
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
      {/* Main column */}
      <div className="lg:col-span-8 space-y-8">
        {/* Loan Portfolio */}
        <div className="bg-white dark:bg-white/[0.02] p-6 sm:p-10 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] gap-4"
              >
                <div className="flex items-center gap-5">
                  <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-40 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:flex md:items-center gap-6">
                  <div className="space-y-2">
                    <Skeleton className="h-2.5 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-2.5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-4 space-y-8">
        {/* Account Insight (indigo gradient) */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-700/20 dark:from-indigo-500/10 dark:to-indigo-700/10 p-6 sm:p-10 rounded-[2.5rem] border border-indigo-500/10 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-11 w-11 rounded-2xl bg-indigo-500/20" />
            <Skeleton className="h-5 w-32 rounded-lg bg-indigo-500/20" />
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-3 w-32 rounded-full bg-indigo-500/20" />
              <div className="flex items-end justify-between">
                <Skeleton className="h-9 w-20 rounded-lg bg-indigo-500/20" />
                <Skeleton className="h-3 w-16 rounded bg-indigo-500/10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full bg-indigo-500/10" />
            </div>
            <div className="pt-4 border-t border-indigo-500/10 grid grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-2.5 w-20 rounded-full bg-indigo-500/15" />
                  <Skeleton className="h-4 w-16 rounded bg-indigo-500/20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Professional & Identity */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-40 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-24 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[200px] rounded" />
              </div>
            ))}
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <Skeleton className="h-2.5 w-20 rounded-full mb-3" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Profile Metadata */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-8 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-2"
              >
                <Skeleton className="h-2 w-24 rounded-full" />
                <Skeleton className="h-4 w-full max-w-[180px] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CustomerProfileSkeleton;
