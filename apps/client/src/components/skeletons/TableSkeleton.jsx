/* eslint-disable react/prop-types -- project convention: no propTypes */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TableSkeleton = ({ rows = 5, columns = 5, className }) => {
  return (
    <div className={cn('w-full space-y-6 animate-in fade-in duration-500', className)}>
      <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden relative">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                {[...Array(columns)].map((_, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-4 py-3 text-left',
                      i === columns - 1 && 'text-right',
                    )}
                  >
                    <Skeleton className="h-2.5 w-20 rounded-full" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(rows)].map((_, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-slate-100 dark:border-white/[0.06] last:border-0"
                >
                  {[...Array(columns)].map((_, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-4 py-3',
                        colIndex === columns - 1 && 'text-right',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center gap-3',
                          colIndex === columns - 1 && 'justify-end',
                        )}
                      >
                        {colIndex === 1 && (
                          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        )}
                        {colIndex === 2 && (
                          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        )}

                        <div
                          className={cn(
                            'space-y-1.5',
                            colIndex === columns - 1 ? 'flex-0' : 'flex-1',
                          )}
                        >
                          <Skeleton
                            className={cn(
                              'h-3 rounded',
                              colIndex === 0
                                ? 'w-24'
                                : colIndex === columns - 1
                                  ? 'w-8'
                                  : 'w-20',
                            )}
                          />
                          {(colIndex === 0 || colIndex === 1) && (
                            <Skeleton className="h-2 w-16 rounded" />
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

        <div className="p-5 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32 rounded" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSkeleton;
