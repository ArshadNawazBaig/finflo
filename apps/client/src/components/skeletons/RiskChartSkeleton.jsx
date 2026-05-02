import { Skeleton } from '@/components/ui/skeleton';

const RiskChartSkeleton = () => (
  <div className="rounded-[2.5rem] border border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-8 shadow-sm animate-pulse">
    {/* Header */}
    <div className="border-b border-border/50 pb-5 mb-6 flex items-center gap-3">
      <Skeleton className="h-5 w-5 rounded-md bg-muted/40" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-3 w-28 rounded-lg" />
      </div>
    </div>
    {/* Body: donut placeholder + legend */}
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      {/* Circle skeleton */}
      <div className="relative flex-shrink-0 w-[140px] h-[140px]">
        <div className="absolute inset-0 rounded-full border-[20px] border-muted/20" />
        <div
          className="absolute inset-0 rounded-full border-[20px] border-transparent"
          style={{
            borderTopColor: 'hsl(var(--muted)/0.4)',
            transform: 'rotate(-45deg)',
          }}
        />
      </div>
      {/* Legend lines */}
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
);

export default RiskChartSkeleton;
