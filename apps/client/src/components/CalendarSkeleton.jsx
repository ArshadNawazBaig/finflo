import { Skeleton } from '@/components/ui/skeleton';

const CalendarSkeleton = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[500px] animate-in fade-in duration-500">
      {/* Calendar Section Skeleton */}
      <div className="flex-1 bg-card/30 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-6 shadow-sm flex flex-col">
        <header className="flex items-center justify-between mb-8 px-2">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-border/50 pb-4 mb-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex justify-center">
              <Skeleton className="h-3 w-10 uppercase tracking-widest" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1">
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="relative h-20 xl:h-24 p-2 rounded-3xl border border-border/5 border-dashed flex flex-col items-center justify-start gap-1"
            >
              <Skeleton className="h-8 w-8 rounded-xl" />
              <div className="flex gap-0.5 mt-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
                <Skeleton className="h-1.5 w-1.5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Side-pane Skeleton */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="flex-1 bg-card/30 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>

          <div className="flex-1 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-3xl border border-border/50 bg-background/40"
              >
                <div className="flex justify-between items-start mb-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border/20">
            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/20">
              <div className="space-y-2">
                <Skeleton className="h-2 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSkeleton;
