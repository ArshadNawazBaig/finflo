import { Skeleton } from '@/components/ui/skeleton';

/**
 * DashboardSkeleton - A lightweight skeleton loader for dashboard page transitions.
 * Mirrors the general layout of dashboard pages (header bar + content cards)
 * so the transition feels seamless rather than a full-page reset.
 */
const DashboardSkeleton = () => {
  return (
    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-pulse">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-2xl" />
          <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[2rem] border border-border/50 p-6 bg-card/50 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-[1rem]" />
              </div>
              <Skeleton className="h-8 w-32 rounded-xl mt-4" />
              <Skeleton className="h-3 w-20 rounded-lg mt-2" />
            </div>
          ))}
        </div>

        {/* Main Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wide Card */}
          <div className="lg:col-span-2 rounded-[2.5rem] border border-border/50 p-8 bg-card/30 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-40 rounded-xl" />
              <Skeleton className="h-8 w-24 rounded-[2rem]" />
            </div>
            <div className="space-y-4 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <Skeleton className="h-3 w-1/2 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Narrow Card */}
          <div className="rounded-[2.5rem] border border-border/50 p-8 bg-card/30 backdrop-blur-sm shadow-sm space-y-4">
            <Skeleton className="h-6 w-32 rounded-xl mb-4" />
            <div className="space-y-5 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-lg" />
                      <Skeleton className="h-3 w-16 rounded-lg" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
