import { Skeleton } from '@/components/ui/skeleton';

const MemberCardSkeleton = () => {
  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2rem] p-6 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-[1rem]" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="space-y-4 mb-6 pt-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2 w-16 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </div>
          <Skeleton className="w-10 h-10 rounded-[1rem]" />
        </div>
      </div>

      <Skeleton className="h-12 w-full rounded-[1rem]" />
    </div>
  );
};

export default MemberCardSkeleton;
