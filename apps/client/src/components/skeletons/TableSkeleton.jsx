import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TableSkeleton = ({ rows = 5, columns = 5, className }) => {
  return (
    <div
      className={cn(
        'w-full space-y-6 animate-in fade-in duration-500',
        className,
      )}
    >
      <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-border/50 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20">
                {[...Array(columns)].map((_, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-8 py-5 text-left',
                      i === columns - 1 && 'text-right',
                    )}
                  >
                    <Skeleton className="h-2 w-20 rounded-full bg-muted/40" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {[...Array(rows)].map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="group/row hover:bg-muted/30 transition-all"
                >
                  {[...Array(columns)].map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-8 py-5',
                        colIndex === columns - 1 && 'text-right',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-3',
                          colIndex === columns - 1 && 'justify-end',
                        )}
                      >
                        {/* Column 2 (Agent/Avatar) mimic */}
                        {colIndex === 1 && (
                          <Skeleton className="h-8 w-8 rounded-full bg-muted/30 shrink-0" />
                        )}

                        {/* Column 3 (Execution Icon) mimic */}
                        {colIndex === 2 && (
                          <Skeleton className="h-8 w-8 rounded-lg bg-muted/20 shrink-0" />
                        )}

                        <div
                          className={cn(
                            'space-y-2',
                            colIndex === columns - 1 ? 'flex-0' : 'flex-1',
                          )}
                        >
                          <Skeleton
                            className={cn(
                              'h-3 rounded-lg bg-muted/30',
                              colIndex === 0
                                ? 'w-24'
                                : colIndex === columns - 1
                                  ? 'w-8'
                                  : 'w-20',
                            )}
                          />
                          {/* Subtitles for Timestamp and Agent */}
                          {(colIndex === 0 || colIndex === 1) && (
                            <Skeleton className="h-2 w-16 rounded-lg bg-muted/20" />
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
        <div className="p-8 border-t border-border/30 bg-muted/10">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded-lg bg-muted/20" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-24 rounded-xl bg-muted/20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-xl bg-muted/30" />
                <Skeleton className="h-10 w-10 rounded-xl bg-muted/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
