import { Skeleton } from '@/components/ui/skeleton';

const QuickActionsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="relative flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
      >
        <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-muted/40 animate-pulse" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    ))}
  </div>
);

export default QuickActionsSkeleton;
