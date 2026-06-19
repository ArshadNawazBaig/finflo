/* eslint-disable react/prop-types -- project convention: no propTypes */
/* Shared skeleton primitives — base building blocks composed by the
   admin/member/teller page skeletons. Re-exported via ../PageSkeletons.jsx. */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Shared primitives ────────────────────────────────────────────────────────

export const CardsSkeleton = ({ count = 4, className }) => {
  return (
    <div
      className={cn(
        `grid grid-cols-1 sm:grid-cols-2 ${count === 3 ? 'md:grid-cols-3' : 'lg:grid-cols-4'} gap-4 sm:gap-6`,
        className,
      )}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] p-5 border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]"
        >
          {/* Top row — eyebrow + icon chip */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>
          {/* Value */}
          <Skeleton className="h-7 w-28 rounded mb-3" />
          {/* Delta + subtitle */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const TableSkeleton = ({ rows = 5, columns = 5, className }) => {
  return (
    <div
      className={cn(
        'w-full space-y-6 animate-in fade-in duration-500',
        className,
      )}
    >
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


/** Matches <PageHeader> (no data fetch — renders instantly, so no skeleton needed here).
 *  Kept as a small utility only for pages that truly need a header placeholder. */
// `actions` = number of action pills to render. Defaults to 1 (matches the
// common "Add X" header). Pages with extra buttons (e.g. Members with Bulk
// Email + Import CSV + Add) pass a higher count so the skeleton lines up
// with the real layout and doesn't flash a single pill before settling.
export const PageHeaderSkeleton = ({ actions = 1 }) => (
  // Mirrors <PageHeader>: stacks (flex-col) on mobile, row on md+. The text
  // column can shrink (min-w-0 + responsive/max widths) so it never overflows
  // the viewport, and the action pills go full-width below the title on mobile.
  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6 mb-6 sm:mb-8 animate-in fade-in duration-200">
    <div className="flex min-w-0 flex-col gap-2.5">
      <Skeleton className="h-2.5 w-24 rounded-full" />
      <Skeleton className="h-7 w-40 sm:w-48 md:w-64 rounded" />
      <Skeleton className="h-3 w-full max-w-[16rem] md:max-w-sm rounded" />
    </div>
    <div className="flex w-full items-center gap-2 md:w-auto md:shrink-0">
      {Array.from({ length: Math.max(1, actions) }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-10 flex-1 rounded-full md:flex-none',
            i === actions - 1 ? 'md:w-32' : 'md:w-28',
          )}
        />
      ))}
    </div>
  </div>
);
