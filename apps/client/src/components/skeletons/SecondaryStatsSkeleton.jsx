import { Skeleton } from '@/components/ui/skeleton';

const SecondaryStatsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className="rounded-[1.5rem] p-5 border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-7 w-24 rounded mb-3" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export default SecondaryStatsSkeleton;
