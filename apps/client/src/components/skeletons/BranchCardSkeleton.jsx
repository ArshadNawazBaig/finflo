import { Skeleton } from '@/components/ui/skeleton';

const BranchCardSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative rounded-[2rem] overflow-hidden border border-border/40 bg-card/10 backdrop-blur-xl"
        >
          {/* Header area skeleton */}
          <div className="h-32 bg-muted/20 animate-pulse relative">
            {/* Logo placeholder */}
            <div className="absolute bottom-0 left-8 translate-y-1/2">
              <div className="w-20 h-20 rounded-[1.5rem] bg-background border-[6px] border-background">
                <Skeleton className="w-full h-full rounded-[1.2rem]" />
              </div>
            </div>
          </div>

          <div className="pt-14 px-8 pb-8 space-y-5">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                {/* Title */}
                <Skeleton className="h-7 w-32 rounded-lg" />
                {/* Badge */}
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              {/* Status Badge */}
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="space-y-4 pt-2">
              {/* Address row */}
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-muted/10 border border-transparent">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 pt-1">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
              {/* Contact row */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-transparent">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BranchCardSkeleton;
