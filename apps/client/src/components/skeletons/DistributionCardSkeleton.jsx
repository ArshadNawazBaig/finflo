import { Skeleton } from '@/components/ui/skeleton';

const DistributionCardSkeleton = () => {
  return (
    <div className="p-6 rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-sm shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-[1rem]" />
          <div className="space-y-3 pt-1">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-lg" />
        </div>
      </div>
      
      <div className="flex justify-between items-end pt-4 border-t border-border/50">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-16 rounded-lg" />
      </div>
    </div>
  );
};

export default DistributionCardSkeleton;
