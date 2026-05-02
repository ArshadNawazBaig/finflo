import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TableSkeleton = ({ rows = 5, columns = 5, className }) => {
  return (
    <div
      className={cn(
        'w-full space-y-6 animate-pulse',
        className,
      )}
    >
      <div className="rounded-[2.5rem] bg-card/30 backdrop-blur-sm border border-border/50 overflow-hidden relative shadow-sm">

        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/10">
                {[...Array(columns)].map((_, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-8 py-6 text-left',
                      i === columns - 1 && 'text-right',
                    )}
                  >
                    <Skeleton className="h-3 w-24 rounded-full bg-muted/40" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[...Array(rows)].map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="group/row hover:bg-muted/30 transition-all"
                >
                  {[...Array(columns)].map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-8 py-6',
                        colIndex === columns - 1 && 'text-right',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-4',
                          colIndex === columns - 1 && 'justify-end',
                        )}
                      >
                        {/* Column 2 (Agent/Avatar) mimic */}
                        {colIndex === 1 && (
                          <Skeleton className="h-10 w-10 rounded-full bg-muted/30 shrink-0" />
                        )}

                        {/* Column 3 (Execution Icon) mimic */}
                        {colIndex === 2 && (
                          <Skeleton className="h-10 w-10 rounded-[1rem] bg-muted/20 shrink-0" />
                        )}

                        <div
                          className={cn(
                            'space-y-3',
                            colIndex === columns - 1 ? 'flex-0' : 'flex-1',
                          )}
                        >
                          <Skeleton
                            className={cn(
                              'h-4 rounded-lg bg-muted/30',
                              colIndex === 0
                                ? 'w-32'
                                : colIndex === columns - 1
                                  ? 'w-12'
                                  : 'w-24',
                            )}
                          />
                          {/* Subtitles for Timestamp and Agent */}
                          {(colIndex === 0 || colIndex === 1) && (
                            <Skeleton className="h-2.5 w-20 rounded-lg bg-muted/20" />
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

        {/* Pagination Section Mimic */}
        <div className="p-8 border-t border-border/50 bg-muted/5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 rounded-lg bg-muted/20" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32 rounded-xl bg-muted/20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-12 w-12 rounded-xl bg-muted/30" />
                <Skeleton className="h-12 w-12 rounded-xl bg-muted/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
