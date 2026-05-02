import { Skeleton } from '@/components/ui/skeleton';

const SecondaryStatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-sm p-6 flex flex-col gap-4 shadow-sm animate-pulse"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-12 rounded-[1rem] bg-muted/40" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-3 w-28 rounded-lg mt-1" />
        </div>
      </div>
    ))}
  </div>
);

export default SecondaryStatsSkeleton;
