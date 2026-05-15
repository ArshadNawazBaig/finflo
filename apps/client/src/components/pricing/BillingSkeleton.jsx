import { Skeleton } from '@/components/ui/skeleton';

const BillingSkeleton = () => (
  <div className="space-y-6 pb-10 animate-in fade-in duration-200">
    {/* Page Header (non-card variant) */}
    <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div className="space-y-2 max-w-2xl">
        <Skeleton className="h-7 w-56 rounded-lg" />
        <Skeleton className="h-3.5 w-80 rounded" />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Current Plan */}
        <section className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-72 rounded" />
                <Skeleton className="h-3.5 w-56 rounded" />
              </div>
            </div>
            <Skeleton className="h-12 w-48 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-2.5 w-16 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </section>

        {/* Payment Methods */}
        <section className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
          <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-3.5 w-56 rounded" />
            </div>
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-slate-100 dark:border-white/[0.06] rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-8 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* Billing History */}
        <section className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-white/[0.06] space-y-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3.5 w-56 rounded" />
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-2"
              >
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Pro Benefits (indigo gradient) */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-violet-700/20 dark:from-indigo-500/10 dark:to-violet-700/10 rounded-2xl p-5 sm:p-8 border border-indigo-500/10 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-11 w-11 rounded-xl bg-indigo-500/20" />
            <Skeleton className="h-6 w-32 rounded-lg bg-indigo-500/20" />
          </div>
          <ul className="space-y-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full bg-indigo-500/20" />
                <Skeleton className="h-4 w-36 rounded bg-indigo-500/20" />
              </li>
            ))}
          </ul>
          <Skeleton className="h-12 w-full rounded-full bg-indigo-500/20" />
        </div>

        {/* Usage Limits */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-5 sm:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-28 rounded-lg" />
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-10 rounded" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-3 w-24 rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default BillingSkeleton;
