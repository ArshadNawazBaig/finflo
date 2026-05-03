import { Skeleton } from '@/components/ui/skeleton';

const MemberProfileSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    {/* Page Header Skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card/30 p-5 sm:p-8 rounded-[2.5rem] border border-border/50 gap-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-[1.5rem]" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
        <div className="flex gap-2">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 w-32 rounded-2xl" />
          <Skeleton className="h-12 w-32 rounded-2xl" />
        </div>
      </div>
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-[120px] rounded-[2rem] border border-border/50 bg-card/50 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-32 rounded-xl mt-4" />
        </div>
      ))}
    </div>

    {/* Main Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
      <div className="lg:col-span-8 space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm p-8">
             <Skeleton className="h-8 w-48 rounded-xl mb-6" />
             <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
             </div>
          </div>
        ))}
      </div>
      <div className="lg:col-span-4 space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm p-6 ${i === 0 ? 'h-[400px]' : 'h-[250px]'}`}>
             <Skeleton className="h-6 w-32 rounded-lg mb-6" />
             <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
             </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default MemberProfileSkeleton;
