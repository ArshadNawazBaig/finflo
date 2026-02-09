import { Skeleton } from '@/components/ui/skeleton';

const TableSkeleton = () => {
  return (
    <div className="w-full">
      {/* Search Bar Skeleton */}
      <div className="mb-6 flex gap-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex bg-muted/20 p-4 rounded-xl">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 flex-1 mx-2" />
            ))}
          </div>

          {/* Rows */}
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center p-4 border-b border-border/50 last:border-0"
            >
              {[1, 2, 3, 4, 5].map((col) => (
                <div key={col} className="flex-1 px-4">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
