import { Skeleton } from '@/components/ui/skeleton';

const MemberDashboardSkeleton = () => {
  return (
    <div className="space-y-10 animate-pulse pb-20">
      {/* ── Stat Cards: 1-col mobile / 2-col sm / 5-col lg ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-[2rem] p-5 sm:p-7 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-muted/40" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Buttons ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
        <Skeleton className="h-12 w-40 rounded-2xl" />
        <Skeleton className="h-12 w-40 rounded-2xl" />
        <Skeleton className="h-12 w-36 rounded-2xl" />
      </div>

      {/* ── Main layout: single-col on mobile / 3-col on lg ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left col (spans 2 on lg) */}
        <div className="lg:col-span-2 space-y-8">
          {/* FinFlo Insights */}
          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-3 w-52 rounded" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-muted/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-7 w-28 rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Cash Flow chart */}
          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-muted/40" />
            </div>
            <div className="h-[240px] sm:h-[300px] flex items-end gap-2 sm:gap-3 px-2">
              {[60, 85, 45, 92, 70, 55].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div
                    className="w-full bg-muted/40 rounded-t-xl"
                    style={{ height: `${h}%` }}
                  />
                  <Skeleton className="h-3 w-6 sm:w-8 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Loan Requests */}
          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3 w-52 rounded hidden sm:block" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 sm:p-6 rounded-[2rem] border border-border/50 bg-muted/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Skeleton className="h-5 w-28 sm:w-32 rounded" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-36 sm:w-44 rounded" />
                      <Skeleton className="h-2 w-full rounded-full mt-2" />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: Saving Goals — full width on mobile, sidebar on lg */}
        <div className="lg:col-span-1">
          <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-[1.5rem] border border-border/40 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboardSkeleton;
