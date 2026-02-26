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
        className="flex-1 min-w-[240px] flex items-center gap-4 rounded-full border border-border/40 bg-card/40 p-2 pr-5"
      >
        {/* Left Icon Pill */}
        <div className="h-11 w-11 shrink-0 rounded-full bg-muted/40 animate-pulse" />

        {/* Center Text */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-2 w-28 rounded" />
        </div>

        {/* Right Arrow */}
        <div className="h-7 w-7 shrink-0 rounded-full bg-muted/30 animate-pulse" />
      </div>
    ))}
  </div>
);

export default QuickActionsSkeleton;
