import { Skeleton } from '@/components/ui/skeleton';

const RiskChartSkeleton = () => (
  <div className="rounded-[2rem] border border-border/40 bg-card/10 backdrop-blur-sm p-4 sm:p-6">
    {/* Header */}
    <div className="border-b border-border/40 pb-4 mb-5 flex items-center gap-2">
      <div className="h-4 w-4 rounded bg-muted/40 animate-pulse" />
      <div className="space-y-1.5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
    {/* Body: donut placeholder + legend */}
    <div className="flex items-center justify-between gap-4">
      {/* Circle skeleton */}
      <div className="relative flex-shrink-0 w-[120px] h-[120px]">
        <div className="absolute inset-0 rounded-full border-[18px] border-muted/30 animate-pulse" />
        <div
          className="absolute inset-0 rounded-full border-[18px] border-transparent"
          style={{
            borderTopColor: 'hsl(var(--muted)/0.6)',
            transform: 'rotate(-45deg)',
          }}
        />
      </div>
      {/* Legend lines */}
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
);

export default RiskChartSkeleton;
