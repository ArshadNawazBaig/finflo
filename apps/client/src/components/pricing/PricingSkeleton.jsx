import { Skeleton } from '@/components/ui/skeleton';

const PricingSkeleton = () => {
  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-10 rounded-[2.5rem] bg-card/50 border border-border/50 space-y-8"
          >
            <div className="space-y-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>

            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingSkeleton;
