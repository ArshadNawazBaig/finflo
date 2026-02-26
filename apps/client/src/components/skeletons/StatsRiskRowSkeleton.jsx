import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for Row 1: 4 stat cards (2×2 left) + Portfolio Risk chart (right)
 * Mirrors the xl:grid-cols-3 / col-span-2 + col-span-1 layout.
 */
const StatsRiskRowSkeleton = () => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
    {/* Left — 2×2 stat cards */}
    <div className="xl:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/50 backdrop-blur-sm p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-muted/40 animate-pulse" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-2.5 w-28 rounded" />
          </div>
        </div>
      ))}
    </div>

    {/* Right — Risk chart skeleton */}
    <div className="xl:col-span-1 rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm p-4 sm:p-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-4 mb-5 flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-muted/40 animate-pulse" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      {/* Donut + legend */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-shrink-0 w-[120px] h-[120px]">
          <div className="absolute inset-0 rounded-full border-[18px] border-muted/30 animate-pulse" />
        </div>
        <div className="flex-1 space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted/50 animate-pulse" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-3 w-10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default StatsRiskRowSkeleton;
