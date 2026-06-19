/* eslint-disable react/prop-types -- project convention: no propTypes */
import { Skeleton } from '@/components/ui/skeleton';

const BranchCardSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative rounded-[2rem] overflow-hidden border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] animate-pulse"
        >
          {/* Header area skeleton */}
          <div className="h-32 bg-slate-50/60 dark:bg-white/[0.03] relative">
            {/* Logo placeholder */}
            <div className="absolute bottom-0 left-8 translate-y-1/2">
              <div className="w-20 h-20 rounded-[1.5rem] bg-white dark:bg-[#0b0f1a] border-[6px] border-white dark:border-[#0b0f1a]">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            </div>
          </div>

          <div className="pt-14 px-6 sm:px-8 pb-8 space-y-5">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                {/* Title */}
                <Skeleton className="h-7 w-32 rounded-lg" />
                {/* Badge */}
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              {/* Status Badge */}
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              {/* Address row */}
              <div className="flex items-start gap-4 p-3 rounded-[1rem] bg-slate-50/40 dark:bg-white/[0.02] border border-transparent">
                <Skeleton className="h-10 w-10 rounded-[1rem] shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-3 w-full rounded-lg" />
                  <Skeleton className="h-3 w-3/4 rounded-lg" />
                </div>
              </div>
              {/* Contact row */}
              <div className="flex items-center gap-4 p-3 rounded-[1rem] bg-slate-50/40 dark:bg-white/[0.02] border border-transparent">
                <Skeleton className="h-10 w-10 rounded-[1rem] shrink-0" />
                <Skeleton className="h-4 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BranchCardSkeleton;
