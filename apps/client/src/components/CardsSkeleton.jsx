import { Skeleton } from '@/components/ui/skeleton';

const CardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[2rem] p-6 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-muted/30">
              <Skeleton className="h-6 w-6" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardsSkeleton;
