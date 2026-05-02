import { Skeleton } from '@/components/ui/skeleton';

const CardsSkeleton = ({ count = 4 }) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${count === 3 ? 'md:grid-cols-3' : 'lg:grid-cols-4'} gap-4 sm:gap-6 lg:gap-8`}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[2rem] p-6 border border-border/50 bg-card/50 shadow-sm space-y-4 animate-pulse"
        >
          <div className="flex justify-between items-start mb-4">
            <Skeleton className="h-12 w-12 rounded-[1rem]" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-xl" />
            <Skeleton className="h-3 w-24 rounded-lg mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardsSkeleton;
