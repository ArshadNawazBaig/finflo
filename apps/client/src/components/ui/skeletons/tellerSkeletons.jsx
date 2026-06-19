/* eslint-disable react/prop-types -- project convention: no propTypes */
/* Teller-mode skeletons. Re-exported via ../PageSkeletons.jsx. */
import { Skeleton } from '@/components/ui/skeleton';

export const TellerStatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="p-5 rounded-[1.5rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-7 w-28 rounded mb-2" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    ))}
  </div>
);

export const TellerMemberCardSkeleton = () => (
  <div className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-6 animate-in fade-in duration-500">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>

    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-2.5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      ))}
    </div>

    <Skeleton className="h-12 w-full rounded-full" />
  </div>
);

export const TellerJournalSkeleton = () => (
  <div className="w-full space-y-6 animate-in fade-in duration-500">
    <div className="p-5 sm:p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-8">
      {/* Summary stats — stack on mobile so the values never exceed their cell */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-7 w-28 sm:w-32 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {/* Column header row — only meaningful on the wider table layout */}
        <div className="hidden sm:flex border-b border-slate-100 dark:border-white/[0.06] pb-3 justify-between px-2">
           {Array.from({ length: 4 }).map((_, i) => (
             <Skeleton key={i} className="h-2.5 w-20 rounded-full" />
           ))}
        </div>
        {/* Rows: identity flexes/shrinks, trailing meta stays fixed — no overflow */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3 px-2 flex items-center gap-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-3 w-12 sm:w-16 rounded" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-3 w-24 max-w-full rounded" />
            </div>
            <Skeleton className="h-5 w-14 sm:w-16 rounded-full shrink-0" />
            <Skeleton className="h-3 w-16 sm:w-20 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const TellerSearchSkeleton = () => (
  <div className="space-y-1 p-1">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-2 w-32 rounded" />
        </div>
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
    ))}
  </div>
);
