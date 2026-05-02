import { Skeleton } from '@/components/ui/skeleton';

const BranchCardSkeleton = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative rounded-[2.5rem] overflow-hidden border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm animate-pulse"
        >
          {/* Header area skeleton */}
          <div className="h-32 bg-muted/10 relative">
            {/* Logo placeholder */}
            <div className="absolute bottom-0 left-8 translate-y-1/2">
              <div className="w-20 h-20 rounded-[1.5rem] bg-card border-[6px] border-card">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            </div>
          </div>

          <div className="pt-14 px-8 pb-8 space-y-5">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                {/* Title */}
                <Skeleton className="h-7 w-32 rounded-lg" />
                {/* Badge */}
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              {/* Status Badge */}
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              {/* Address row */}
              <div className="flex items-start gap-4 p-3 rounded-[1rem] bg-muted/5 border border-transparent">
                <Skeleton className="h-10 w-10 rounded-[1rem] shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-3 w-full rounded-lg" />
                  <Skeleton className="h-3 w-3/4 rounded-lg" />
                </div>
              </div>
              {/* Contact row */}
              <div className="flex items-center gap-4 p-3 rounded-[1rem] bg-muted/5 border border-transparent">
                <Skeleton className="h-10 w-10 rounded-[1rem] shrink-0" />
                <Skeleton className="h-4 w-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BranchCardSkeleton;
