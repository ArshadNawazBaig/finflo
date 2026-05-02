import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for Row 1: 4 stat cards (2×2 left) + Portfolio Risk chart (right)
 * Mirrors the xl:grid-cols-3 / col-span-2 + col-span-1 layout.
 */
const StatsRiskRowSkeleton = () => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 animate-pulse">
    {/* Left — 2×2 stat cards */}
    <div className="xl:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-sm p-6 flex flex-col gap-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-12 w-12 rounded-[1rem] bg-muted/40" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-3 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>

    {/* Right — Risk chart skeleton */}
    <div className="xl:col-span-1 rounded-[2.5rem] border border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-8 shadow-sm flex flex-col">
      {/* Header */}
      <div className="border-b border-border/50 pb-5 mb-6 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded-md bg-muted/40" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-lg" />
        </div>
      </div>
      {/* Donut + legend */}
      <div className="flex flex-col sm:flex-row xl:flex-col items-center justify-between gap-6 flex-1">
        <div className="relative flex-shrink-0 w-[140px] h-[140px]">
          <div className="absolute inset-0 rounded-full border-[20px] border-muted/20" />
        </div>
        <div className="flex-1 space-y-3 w-full">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full bg-muted/50" />
                <Skeleton className="h-4 w-20 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-12 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default StatsRiskRowSkeleton;
