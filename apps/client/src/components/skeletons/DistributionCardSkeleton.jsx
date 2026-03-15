import { Skeleton } from '@/components/ui/skeleton';

const DistributionCardSkeleton = () => {
  return (
    <div className="p-5 rounded-[2rem] border border-border/40 bg-card space-y-4 shadow-sm animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>
      
      <div className="flex justify-between items-end pt-2">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

export default DistributionCardSkeleton;
