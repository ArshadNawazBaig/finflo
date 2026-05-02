import { Skeleton } from '@/components/ui/skeleton';

const BillingSkeleton = () => {
  return (
    <div className="space-y-6 pb-10 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan Section Skeleton */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-32 rounded-lg" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-64 rounded-lg" />
                  <Skeleton className="h-4 w-48 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-12 w-48 rounded-[1.5rem]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-border/50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-3 w-16 rounded-lg" />
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Skeleton */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="h-4 w-56 rounded-lg" />
              </div>
              <Skeleton className="h-10 w-32 rounded-[1.5rem]" />
            </div>

            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-5 border border-border/50 rounded-[1.5rem]"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40 rounded-lg" />
                      <Skeleton className="h-3 w-28 rounded-lg" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-20 rounded-[1rem]" />
                </div>
              ))}
            </div>
          </div>

          {/* Billing History Skeleton */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border/50">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-4 w-48 rounded-lg" />
              </div>
            </div>
            <div className="p-8 space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20 rounded-lg" />
                  <Skeleton className="h-4 w-24 rounded-lg" />
                  <Skeleton className="h-4 w-16 rounded-lg" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-lg mr-2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info Skeleton */}
        <div className="space-y-8">
          {/* Pro Benefits Card Skeleton */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-8 shadow-sm h-[400px] flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <Skeleton className="w-12 h-12 rounded-[1rem]" />
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
            <div className="space-y-5 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-lg" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-[1.5rem] mt-auto" />
          </div>

          {/* Usage Limits Skeleton */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
            <Skeleton className="h-6 w-32 rounded-lg mb-8" />
            <div className="space-y-8">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20 rounded-lg" />
                    <Skeleton className="h-4 w-10 rounded-lg" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-lg ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSkeleton;
