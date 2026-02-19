import { Skeleton } from '@/components/ui/skeleton';

const MemberTransactionsSkeleton = ({ count = 6 }) => {
  return (
    <>
      {/* ── Mobile: MemberActivityCard-style cards ─── */}
      <div className="p-4 space-y-4 md:hidden animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="bg-card/40 border border-border/40 rounded-[2rem] p-6 shadow-sm"
          >
            {/* Top row: icon + desc + amount */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-6 w-24 rounded ml-auto" />
                <Skeleton className="h-2 w-12 rounded ml-auto" />
              </div>
            </div>
            {/* Bottom 2-cell grid: date + portfolio */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-10 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-14 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: row-list ─────────────────────── */}
      <div className="hidden md:block divide-y divide-border/40 animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-right shrink-0">
              <Skeleton className="h-6 w-28 rounded ml-auto" />
              <Skeleton className="h-3 w-20 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MemberTransactionsSkeleton;
