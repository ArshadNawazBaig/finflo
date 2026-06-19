/* eslint-disable react/prop-types -- project convention: no propTypes */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ChartSkeleton = ({ className }) => {
  return (
    <div
      className={cn(
        'w-full h-[400px] flex flex-col gap-6 p-5 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] animate-pulse',
        className,
      )}
    >
      {/* Chart Title Placeholder */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="space-y-3 min-w-0">
          <Skeleton className="h-6 w-40 sm:w-48 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-4 w-32 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-10 w-20 sm:w-24 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
        </div>
      </div>

      {/* Chart Body Placeholder */}
      <div className="flex-1 flex items-end justify-between gap-2 sm:gap-3 px-2">
        {[40, 70, 45, 90, 65, 30, 85, 55, 75, 50, 95, 60].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <Skeleton
              className="w-full rounded-t-[1rem] bg-slate-100 dark:bg-white/[0.06]"
              style={{ height: `${height}%` }}
            />
            <Skeleton className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/[0.06]" />
          </div>
        ))}
      </div>

      {/* X-Axis Placeholder */}
      <div className="flex justify-between px-4 mt-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-3 w-8 sm:w-12 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
};

export default ChartSkeleton;
