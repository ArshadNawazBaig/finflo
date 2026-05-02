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
        className="flex-1 min-w-[240px] flex items-center gap-4 rounded-full border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm p-3 pr-6 animate-pulse"
      >
        {/* Left Icon Pill */}
        <Skeleton className="h-12 w-12 shrink-0 rounded-full bg-muted/40" />

        {/* Center Text */}
        <div className="flex-1 flex flex-col justify-center gap-2">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-lg" />
        </div>

        {/* Right Arrow */}
        <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-muted/30" />
      </div>
    ))}
  </div>
);

export default QuickActionsSkeleton;

