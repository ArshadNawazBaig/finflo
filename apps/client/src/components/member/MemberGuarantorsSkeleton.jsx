import { Skeleton } from '@/components/ui/skeleton';

const GuarantorCardSkeleton = ({ accentClass = 'bg-blue-500/10' }) => (
  <div className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <Skeleton className={`h-12 w-12 rounded-2xl ${accentClass}`} />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-4 rounded mt-1" />
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2 w-16 rounded-full" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  </div>
);

const SectionSkeleton = ({ iconAccent, count = 3 }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className={`w-10 h-10 rounded-2xl ${iconAccent}`} />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
      </div>
      <Skeleton className="ml-auto h-7 w-10 rounded-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <GuarantorCardSkeleton
          key={i}
          accentClass={iconAccent.replace('w-10 h-10 ', '')}
        />
      ))}
    </div>
  </div>
);

const MemberGuarantorsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200 pb-12">
    {/* Page Header (non-card variant) */}
    <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div className="flex items-center gap-4 max-w-2xl">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-3.5 w-64 rounded" />
        </div>
      </div>
    </div>

    {/* Filter Tabs */}
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-full" />
      ))}
    </div>

    {/* Guarantors Section */}
    <SectionSkeleton iconAccent="bg-blue-500/10" count={3} />

    {/* Acting as Guarantor Section */}
    <SectionSkeleton iconAccent="bg-purple-500/10" count={3} />
  </div>
);

export default MemberGuarantorsSkeleton;
