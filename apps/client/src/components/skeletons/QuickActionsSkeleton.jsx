/* eslint-disable react/prop-types -- project convention: no propTypes */
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton mirrors the sleek horizontal pill-style action strips:
 *  - circle icon (left)
 *  - two text lines (middle)
 *  - small circle (right)
 */
const QuickActionsSkeleton = ({ count = 4 }) => (
  <div className="flex flex-wrap gap-3 sm:gap-4">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="flex-1 min-w-[240px] flex items-center gap-4 rounded-full border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-3 pr-6 animate-pulse"
      >
        {/* Left Icon Pill */}
        <Skeleton className="h-12 w-12 shrink-0 rounded-full bg-slate-100 dark:bg-white/[0.06]" />

        {/* Center Text */}
        <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
          <Skeleton className="h-4 w-20 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
          <Skeleton className="h-3 w-28 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
        </div>

        {/* Right Arrow */}
        <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
      </div>
    ))}
  </div>
);

export default QuickActionsSkeleton;

