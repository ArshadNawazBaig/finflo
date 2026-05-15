import { Skeleton } from '@/components/ui/skeleton';

const PlanCardSkeleton = ({ highlight = false }) => (
  <div
    className={`relative p-6 sm:p-10 rounded-[2rem] flex flex-col ${
      highlight
        ? 'bg-white dark:bg-white/[0.04] border-2 border-primary scale-105 z-10'
        : 'bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]'
    }`}
  >
    {highlight && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
    )}

    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
      <div className="flex items-baseline gap-2">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-4 w-10 rounded" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3.5 w-full rounded" />
        <Skeleton className="h-3.5 w-3/4 rounded" />
      </div>
    </div>

    <ul className="space-y-4 mb-10 flex-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <Skeleton className="h-3.5 w-full max-w-[180px] rounded" />
        </li>
      ))}
    </ul>

    <Skeleton className="h-12 w-full rounded-full" />
  </div>
);

const PricingSkeleton = () => (
  <div className="space-y-8 pb-10 animate-in fade-in duration-200">
    {/* Page Header (non-card variant) */}
    <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div className="space-y-2 max-w-2xl">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-3.5 w-80 rounded" />
      </div>
    </div>

    {/* Plan Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <PlanCardSkeleton />
      <PlanCardSkeleton highlight />
      <PlanCardSkeleton />
    </div>

    {/* Custom Solution CTA */}
    <div className="mt-16 p-6 sm:p-12 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] flex flex-col items-center text-center space-y-5">
      <Skeleton className="h-7 w-72 rounded-lg" />
      <div className="space-y-2 w-full max-w-2xl">
        <Skeleton className="h-3.5 w-full rounded mx-auto" />
        <Skeleton className="h-3.5 w-5/6 rounded mx-auto" />
        <Skeleton className="h-3.5 w-2/3 rounded mx-auto" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Skeleton className="h-12 w-44 rounded-full" />
        <Skeleton className="h-12 w-52 rounded-full" />
      </div>
    </div>
  </div>
);

export default PricingSkeleton;
