import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TableSkeleton = ({ rows = 5, columns = 5, className }) => {
  return (
    <div
      className={cn(
        'w-full space-y-4 animate-in fade-in duration-500',
        className,
      )}
    >
      <div className="rounded-[2rem] border border-border/50 bg-card/30 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {[...Array(columns)].map((_, i) => (
                  <th key={i} className="px-6 py-5">
                    <Skeleton className="h-4 w-24 rounded-lg bg-muted/40" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(rows)].map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/5 transition-colors"
                >
                  {[...Array(columns)].map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {colIndex === 0 && (
                          <Skeleton className="h-10 w-10 rounded-xl bg-muted/30 shrink-0" />
                        )}
                        <div className="space-y-2 flex-1">
                          <Skeleton
                            className={cn(
                              'h-3 rounded-lg bg-muted/30',
                              colIndex === 0 ? 'w-32' : 'w-24',
                            )}
                          />
                          {colIndex === 0 && (
                            <Skeleton className="h-2 w-20 rounded-lg bg-muted/20" />
                          )}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between px-6 py-4 rounded-[1.5rem] bg-card/20 border border-border/40">
        <Skeleton className="h-4 w-32 rounded-lg bg-muted/30" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg bg-muted/30" />
          <Skeleton className="h-8 w-8 rounded-lg bg-muted/30" />
          <Skeleton className="h-8 w-8 rounded-lg bg-muted/30" />
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
