import { Skeleton } from '@/components/ui/skeleton';

const CalendarSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[500px] animate-pulse lg:overflow-hidden">
      {/* Calendar Section Skeleton */}
      <div className="flex-1 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-5 sm:p-8 flex flex-col">
        <header className="flex items-center justify-between mb-6 sm:mb-8 px-2 gap-3">
          <div className="min-w-0">
            <Skeleton className="h-8 w-40 sm:w-48 mb-2 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-3 w-32 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
          </div>
          <div className="flex items-center gap-2 bg-slate-50/40 dark:bg-white/[0.02] p-2 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] shrink-0">
            <Skeleton className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
            <Skeleton className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/[0.06] pb-4 mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex justify-center">
              <Skeleton className="h-4 w-8 sm:w-12 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="relative h-16 sm:h-20 xl:h-24 p-2 sm:p-3 rounded-2xl border border-dashed border-slate-100 dark:border-white/[0.06] flex flex-col items-center justify-start gap-1"
            >
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-[1rem] bg-slate-100 dark:bg-white/[0.06]" />
              <div className="flex gap-1 mt-2">
                <Skeleton className="h-2 w-2 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-2 w-2 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Side-pane Skeleton */}
      <div className="w-full lg:w-80 flex flex-col gap-6 lg:overflow-hidden lg:max-h-full">
        <div className="flex-1 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-5 sm:p-8 flex flex-col lg:overflow-hidden">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <Skeleton className="h-6 w-32 mb-2 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
              <Skeleton className="h-3 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
            </div>
            <Skeleton className="h-12 w-12 rounded-[1.5rem] bg-slate-100 dark:bg-white/[0.06]" />
          </div>

          <div className="flex-1 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
              >
                <div className="flex justify-between items-start mb-3">
                  <Skeleton className="h-4 w-20 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                  <Skeleton className="h-5 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                </div>
                <Skeleton className="h-4 w-32 mb-4 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                    <Skeleton className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex justify-between items-center bg-primary/5 p-5 rounded-[1.5rem] border border-primary/20">
              <div className="space-y-3">
                <Skeleton className="h-3 w-20 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
                <Skeleton className="h-6 w-32 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSkeleton;
