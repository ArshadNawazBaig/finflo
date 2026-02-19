import { Skeleton } from '@/components/ui/skeleton';

const MemberLoansSkeleton = ({ count = 4 }) => {
  return (
    <div className="p-6 sm:p-10 animate-pulse">
      {/* Mobile: single-column / Desktop: 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-8 rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-md shadow-sm"
          >
            {/* Header: icon block + status badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Principal + Term grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-28 rounded" />
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-8 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-8 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-border/30">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberLoansSkeleton;
