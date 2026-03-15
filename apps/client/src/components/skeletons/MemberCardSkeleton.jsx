import { Skeleton } from '@/components/ui/skeleton';

const MemberCardSkeleton = () => {
  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-muted/30" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      <div className="space-y-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-muted/20" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-muted/20" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-muted/20" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/20 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2 w-16 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="w-8 h-8 rounded-xl bg-muted/20" />
        </div>
      </div>

      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
};

export default MemberCardSkeleton;
