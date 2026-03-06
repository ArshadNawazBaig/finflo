import { Skeleton } from '@/components/ui/skeleton';

/**
 * DashboardSkeleton - A lightweight skeleton loader for dashboard page transitions.
 * Mirrors the general layout of dashboard pages (header bar + content cards)
 * so the transition feels seamless rather than a full-page reset.
 */
const DashboardSkeleton = () => {
  return (
    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-[2rem]" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/40 p-5 bg-card space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Main Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Wide Card */}
          <div className="lg:col-span-2 rounded-2xl border border-border/40 p-5 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-8 w-24 rounded-[2rem]" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Narrow Card */}
          <div className="rounded-2xl border border-border/40 p-5 bg-card space-y-4">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-14" />
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
