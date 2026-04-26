import { Skeleton } from '@/components/ui/skeleton';

const CardsSkeleton = ({ count = 4 }) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${count === 3 ? 'md:grid-cols-3' : 'lg:grid-cols-4'} gap-4 sm:gap-6 lg:gap-8`}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[2rem] p-5 sm:p-7 border border-border/40 bg-card/10 backdrop-blur-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 animate-pulse" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardsSkeleton;
