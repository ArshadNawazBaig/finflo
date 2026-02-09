import { Skeleton } from '@/components/ui/skeleton';

const ChartSkeleton = () => {
  return (
    <div className="rounded-[2.5rem] border border-border/50 bg-card/50 backdrop-blur-xl p-8 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <div className="h-[350px] w-full flex items-end gap-2">
        {/* Simulate bars/lines */}
        {[...Array(12)].map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg mx-1"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default ChartSkeleton;
