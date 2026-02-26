import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ChartSkeleton = ({ className }) => {
  return (
    <div
      className={cn(
        'w-full h-[400px] flex flex-col gap-6 p-6 rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-md shadow-sm animate-in fade-in duration-700',
        className,
      )}
    >
      {/* Chart Title Placeholder */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48 rounded-lg bg-muted/40" />
          <Skeleton className="h-3 w-32 rounded-lg bg-muted/20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full bg-muted/30" />
          <Skeleton className="h-8 w-8 rounded-full bg-muted/30" />
        </div>
      </div>

      {/* Chart Body Placeholder */}
      <div className="flex-1 flex items-end justify-between gap-3 px-2">
        {[40, 70, 45, 90, 65, 30, 85, 55, 75, 50, 95, 60].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <Skeleton
              className="w-full rounded-t-xl bg-gradient-to-t from-muted/10 to-muted/40 animate-pulse"
              style={{ height: `${height}%` }}
            />
            <Skeleton className="h-2 w-full rounded-full bg-muted/20" />
          </div>
        ))}
      </div>

      {/* X-Axis Placeholder */}
      <div className="flex justify-between px-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-3 w-12 rounded-lg bg-muted/20" />
        ))}
      </div>
    </div>
  );
};

export default ChartSkeleton;
