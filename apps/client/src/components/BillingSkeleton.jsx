import { Skeleton } from '@/components/ui/skeleton';

const BillingSkeleton = () => {
  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Section Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-32 rounded-lg" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-64 rounded" />
                  <Skeleton className="h-4 w-48 rounded" />
                </div>
              </div>
              <Skeleton className="h-10 w-40 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-border/50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-6 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods Skeleton */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="h-4 w-56 rounded" />
              </div>
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>

            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border border-border/50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-8 rounded" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40 rounded" />
                      <Skeleton className="h-3 w-28 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Billing History Skeleton */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/50">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded mr-2" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info Skeleton */}
        <div className="space-y-6">
          {/* Pro Benefits Card Skeleton */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm h-[400px]">
            <div className="flex items-center gap-3 mb-8">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
            <div className="space-y-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-full mt-auto" />
          </div>

          {/* Usage Limits Skeleton */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-sm">
            <Skeleton className="h-6 w-32 rounded-lg mb-6" />
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-20 rounded ml-auto" />
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
