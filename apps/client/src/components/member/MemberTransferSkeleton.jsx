import { Skeleton } from '@/components/ui/skeleton';

const MemberTransferSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse pb-20">
      {/* ── Stat Cards: 1-col mobile / 3-col md ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
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

      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* ── Tab Switcher ───────────────────────────────────── */}
        <div className="flex p-1.5 bg-muted/30 rounded-[2rem] border border-border/50 w-full max-w-md mx-auto">
          <div className="flex-1 h-12 rounded-[1.5rem] bg-primary/20" />
          <div className="flex-1 h-12 rounded-[1.5rem] bg-muted/30 ml-1" />
        </div>

        {/* ── Main two-col layout ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Transfer form skeleton */}
          <div className="bg-card/50 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-6 w-36 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>

            <div className="space-y-6">
              {/* Recipient field */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded ml-4" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
              {/* Amount field */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-28 rounded ml-4" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
              {/* Note field */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded ml-4" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
              {/* Submit button */}
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          </div>

          {/* Right: QR scanner area skeleton */}
          <div className="space-y-6">
            <div className="p-10 rounded-[2.5rem] border-2 border-dashed border-border/40 bg-card/30 flex flex-col items-center justify-center gap-6">
              <div className="h-20 w-20 rounded-3xl bg-muted/40" />
              <div className="text-center space-y-2">
                <Skeleton className="h-5 w-32 rounded mx-auto" />
                <Skeleton className="h-3 w-48 rounded mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberTransferSkeleton;
