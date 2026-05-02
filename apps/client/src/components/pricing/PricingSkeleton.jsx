import { Skeleton } from '@/components/ui/skeleton';

const PricingSkeleton = () => {
  return (
    <div className="space-y-6 pb-10 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-10 rounded-[2.5rem] bg-card/30 border border-border/50 shadow-sm backdrop-blur-sm space-y-8"
          >
            <div className="space-y-4">
              <Skeleton className="h-8 w-28 rounded-full" />
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-12 w-20 rounded-xl" />
                <Skeleton className="h-5 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>

            <div className="space-y-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                </div>
              ))}
            </div>

            <Skeleton className="h-14 w-full rounded-[1.5rem]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingSkeleton;
