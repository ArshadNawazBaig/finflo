import { Skeleton } from '@/components/ui/skeleton';

const SecondaryStatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/10 backdrop-blur-sm p-5 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-xl bg-muted/40 animate-pulse" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-2.5 w-28 rounded mt-1" />
        </div>
      </div>
    ))}
  </div>
);

export default SecondaryStatsSkeleton;
