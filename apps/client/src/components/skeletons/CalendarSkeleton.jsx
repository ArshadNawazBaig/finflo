import { Skeleton } from '@/components/ui/skeleton';

const CalendarSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[500px] animate-pulse overflow-hidden">
      {/* Calendar Section Skeleton */}
      <div className="flex-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-8 flex flex-col shadow-sm">
        <header className="flex items-center justify-between mb-8 px-2">
          <div>
            <Skeleton className="h-8 w-48 mb-2 rounded-xl" />
            <Skeleton className="h-3 w-32 rounded-lg" />
          </div>
          <div className="flex items-center gap-2 bg-muted/10 p-2 rounded-[1.5rem] border border-border/40">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-border/50 pb-4 mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex justify-center">
              <Skeleton className="h-4 w-12 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 overflow-hidden">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="relative h-20 xl:h-24 p-3 rounded-2xl border border-border/10 border-dashed flex flex-col items-center justify-start gap-1"
            >
              <Skeleton className="h-8 w-8 rounded-[1rem]" />
              <div className="flex gap-1 mt-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Side-pane Skeleton */}
      <div className="w-full lg:w-80 flex flex-col gap-6 overflow-hidden max-h-full">
        <div className="flex-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-8 flex flex-col overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Skeleton className="h-6 w-32 mb-2 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-12 rounded-[1.5rem]" />
          </div>

          <div className="flex-1 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-[1.5rem] border border-border/50 bg-card/50"
              >
                <div className="flex justify-between items-start mb-3">
                  <Skeleton className="h-4 w-20 rounded-lg" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-32 mb-4 rounded-lg" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24 rounded-lg" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex justify-between items-center bg-primary/5 p-5 rounded-[1.5rem] border border-primary/20">
              <div className="space-y-3">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-6 w-32 rounded-xl" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSkeleton;
