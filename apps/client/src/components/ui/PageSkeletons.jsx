import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';



// ─── Shared primitives ────────────────────────────────────────────────────────

export const CardsSkeleton = ({ count = 4, className }) => {
  return (
    <div
      className={cn(
        `grid grid-cols-1 sm:grid-cols-2 ${count === 3 ? 'md:grid-cols-3' : 'lg:grid-cols-4'} gap-4 sm:gap-6 lg:gap-8`,
        className,
      )}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-[2rem] p-5 sm:p-7 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 animate-pulse" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded mt-1" />
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
                        {colIndex === 1 && (
                          <Skeleton className="h-8 w-8 rounded-full bg-muted/30 shrink-0" />
                        )}

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


/** Matches <PageHeader> (no data fetch — renders instantly, so no skeleton needed here).
 *  Kept as a small utility only for pages that truly need a header placeholder. */
export const PageHeaderSkeleton = () => (
  <div className="flex items-start justify-between mb-6 md:mb-8 animate-in fade-in duration-200">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48 md:w-64" />
      <Skeleton className="h-4 w-64 md:w-96" />
    </div>
    <Skeleton className="h-10 w-28 rounded-full shrink-0" />
  </div>
);

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
// Matches: PageHeader → Quick Actions (pill row) → 4 StatsCards →
//          xl:grid-cols-3 (2×2 mini-stats + risk donut) →
//          xl:grid-cols-3 (Chart + Activity)

export const AdminDashboardSkeleton = () => (
  <div className="space-y-10 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Quick Actions — horizontal flex pills */}
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 min-w-[240px] h-[3.625rem] rounded-full"
        />
      ))}
    </div>

    {/* Primary Stats Row — 4 cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-5 md:p-6 bg-card space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* ROW 1 — 2×2 mini-stat cards (left 2/3) + Portfolio Risk donut (right 1/3) */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
      {/* Left: 2×2 grid */}
      <div className="xl:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[1.5rem] bg-card border border-border/50 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Right: Portfolio Risk card */}
      <div className="xl:col-span-1 rounded-[2rem] border border-border/50 bg-card p-4 sm:p-6 space-y-4">
        <div className="border-b border-border/40 pb-3 space-y-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-[150px] w-[150px] rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ROW 2 — Cash Flow chart (left 2/3) + Activity feed (right 1/3) */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
      {/* Chart */}
      <div className="xl:col-span-2 rounded-[2rem] border border-border/50 bg-card p-4 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>

      {/* Activity feed */}
      <div className="xl:col-span-1 rounded-[2rem] border border-border/50 bg-card overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 pb-2 border-b border-border/40 flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <div className="p-4 sm:p-6 space-y-5 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Transactions / Generic Table Page ────────────────────────────────────────
// Matches: PageHeader → 4 stats → filter bar (search + date + icon buttons) → table

export const TablePageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Stats Cards */}
    <CardsSkeleton count={4} />

    {/* Filter bar */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/10 p-6 rounded-[2rem] border border-border/40">
      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full justify-between">
        <Skeleton className="h-12 w-full sm:min-w-[300px] rounded-2xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-12 flex-1 sm:w-48 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-[1.25rem] shrink-0" />
          <Skeleton className="h-12 w-12 rounded-[1.25rem] shrink-0" />
        </div>
      </div>
    </div>

    {/* Desktop Table */}
    <TableSkeleton rows={8} columns={6} />
  </div>
);

export const RegistryPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Filter bar */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/10 p-6 rounded-[2rem] border border-border/40">
      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full justify-between">
        <Skeleton className="h-12 w-full sm:min-w-[300px] rounded-2xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-12 flex-1 sm:w-48 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-[1.25rem] shrink-0" />
          <Skeleton className="h-12 w-12 rounded-[1.25rem] shrink-0" />
        </div>
      </div>
    </div>

    {/* Desktop Table */}
    <TableSkeleton rows={8} columns={6} />
  </div>
);

// ─── Loans Page ───────────────────────────────────────────────────────────────
// Matches: PageHeader → 4 stats → search bar → table

export const LoansPageSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-4 md:p-5 bg-card space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>

    {/* Search bar */}
    <Skeleton className="h-12 w-full sm:w-72 rounded-2xl" />

    {/* Desktop Table */}
    <div className="mt-4 hidden md:block rounded-[2rem] border border-border/50 bg-card/50 overflow-hidden">
      <div className="h-12 border-b border-border/40 bg-muted/30" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-6 py-4 border-b border-border/20 last:border-0"
        >
          <div className="flex gap-4 items-center flex-1">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-24 mx-4" />
          <Skeleton className="h-6 w-20 rounded-full mx-4" />
          <Skeleton className="h-4 w-28 mx-4" />
          <Skeleton className="h-8 w-8 rounded-full ml-4" />
        </div>
      ))}
    </div>

    {/* Mobile Cards */}
    <div className="mt-4 md:hidden space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-4 bg-card space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex justify-between pt-2 border-t border-border/10">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Members Page ─────────────────────────────────────────────────────────────
// Matches: PageHeader + button → 4 stats → tabs + search + branch filter → table

export const MembersPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Stats Cards */}
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-4 md:p-5 bg-card space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
      ))}
    </div>

    {/* Tabs + Search + Filter row */}
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-muted/50 p-1.5 rounded-2xl w-full sm:w-auto">
          <Skeleton className="flex-1 sm:w-32 h-10 rounded-xl" />
          <Skeleton className="flex-1 sm:w-36 h-10 rounded-xl" />
        </div>
        {/* Search + branch filter */}
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
          <Skeleton className="h-12 w-full sm:w-64 rounded-2xl" />
          <Skeleton className="h-12 w-full sm:w-48 rounded-2xl" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-[2rem] border border-border/50 bg-card/50 overflow-hidden">
        <div className="h-12 border-b border-border/40 bg-muted/30" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-6 py-4 border-b border-border/20 last:border-0"
          >
            <div className="flex gap-4 items-center flex-1">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-24 mx-6" />
            <Skeleton className="h-6 w-20 rounded-full mx-6" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/40 p-5 bg-card space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="pt-4 border-t border-border/20">
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Activity Logs Page ───────────────────────────────────────────────────────
// Matches: PageHeader (with pill) → Search & Filters row → Table

export const ActivityLogsPageSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Page Header */}
    <div className="flex items-start justify-between mb-6 md:mb-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 md:w-64" />
        <Skeleton className="h-4 w-64 md:w-96" />
      </div>
      <Skeleton className="h-9 w-32 rounded-full shrink-0" />
    </div>

    {/* Search & Filters */}
    <div className="flex flex-col lg:flex-row gap-4">
      <Skeleton className="h-12 flex-1 rounded-2xl min-w-[200px]" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-full sm:w-[180px] rounded-2xl" />
        <Skeleton className="h-12 w-full sm:w-[180px] rounded-2xl" />
      </div>
    </div>

    {/* Desktop Table */}
    <div className="hidden md:block rounded-[2rem] border border-border/50 bg-card/50 overflow-hidden mt-2">
      <div className="h-12 border-b border-border/40 bg-muted/30" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-6 py-4 border-b border-border/20 last:border-0"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-64" />
        </div>
      ))}
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-4 mt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-4 bg-card space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Branches / Cards Page ────────────────────────────────────────────────────
// Matches: PageHeader → search bar (max-w-md) → 3-col card grid
// Each branch card: gradient header (h-32) + offset logo + body with address/phone rows

export const CardsPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Search bar */}
    <Skeleton className="h-12 max-w-md w-full rounded-2xl" />

    {/* Branch Cards grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[2rem] border border-border/40 bg-card overflow-hidden"
        >
          {/* Gradient / banner header */}
          <div className="h-32 bg-muted/50 relative">
            {/* Offset logo */}
            <div className="absolute bottom-0 left-6 translate-y-1/2">
              <Skeleton className="h-20 w-20 rounded-[1.5rem] border-4 border-card" />
            </div>
          </div>

          {/* Body */}
          <div className="pt-14 px-8 pb-8 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-muted/30">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30">
                <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Reports / Analytics Page ─────────────────────────────────────────────────
// Matches: PageHeader → tab bar (5 tabs) → 4 stats → 2-col chart grid

export const ReportsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Tab bar */}
    <div className="flex flex-wrap items-center gap-1 border-b border-border/50 pb-1 overflow-x-auto">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32 shrink-0 rounded-lg mx-1" />
      ))}
    </div>

    {/* Stats Cards */}
    <CardsSkeleton count={4} />

    {/* Chart Grid — 2 cols */}
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[2rem] border border-border/50 bg-card/50 p-4 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Settings Page ────────────────────────────────────────────────────────────
// Matches: PageHeader → lg:grid-cols-4
//   aside (1 col): glassmorphism card with 4 nav buttons + purple account-health card
//   main (3 col): 3 stacked section cards

export const SettingsPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200 pb-12">
    {/* Page Header */}
    <PageHeaderSkeleton />

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      {/* Sidebar */}
      <aside className="lg:col-span-1 space-y-4">
        {/* Nav tabs card */}
        <div className="p-2 rounded-[2.5rem] border border-border/40 bg-card space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-[1.8rem]"
            >
              <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>
          ))}
        </div>

        {/* Account-health card (purple gradient  style) */}
        <div className="p-6 rounded-[2.5rem] bg-muted/50 border border-border/40 space-y-4">
          <Skeleton className="h-3 w-32" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-14 rounded-md" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-14 rounded-md" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:col-span-3 space-y-6">
        {/* Section card 1 — Profile Information */}
        <div className="rounded-[2.5rem] border border-border/40 bg-card p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
            <Skeleton className="h-24 w-24 rounded-[2rem] shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>
        </div>

        {/* Section card 2 — Appearance */}
        <div className="rounded-[2.5rem] border border-border/40 bg-card p-8 space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-64" />
          </div>
          {/* Theme toggle buttons */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          {/* Color palette */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="flex gap-3 flex-wrap pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Section card 3 — Notifications */}
        <div className="rounded-[2.5rem] border border-border/40 bg-card p-8 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-2xl border border-border/30"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);

// ─── Profile Page (MemberProfile, StaffProfile, BranchDetail, etc.) ───────────
// Matches: PageHeader → profile banner card → 3-col grid: info card + 2-col tabs/details

export const ProfilePageSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Profile Banner */}
    <div className="rounded-2xl md:rounded-3xl border border-border/40 p-6 md:p-10 bg-card flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
      <Skeleton className="h-24 md:h-32 w-24 md:w-32 rounded-full shrink-0" />
      <div className="flex-1 space-y-3 md:space-y-4 w-full">
        <Skeleton className="h-7 md:h-8 w-48 md:w-64 mx-auto md:mx-0" />
        <Skeleton className="h-4 md:h-5 w-32 md:w-48 mx-auto md:mx-0" />
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mt-4">
          <Skeleton className="h-8 w-20 md:w-24 rounded-full" />
          <Skeleton className="h-8 w-20 md:w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>

    {/* Details Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Info card (1 col) */}
      <div className="rounded-2xl border border-border/40 p-5 md:p-6 bg-card space-y-4">
        <Skeleton className="h-6 w-32 mb-2 md:mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      {/* Wide content area (2 col) */}
      <div className="md:col-span-2 rounded-2xl border border-border/40 p-5 md:p-6 bg-card space-y-4">
        {/* Tab buttons */}
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 md:h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// ─── Chat Page ────────────────────────────────────────────────────────────────
// Matches: sidebar (contact list) + chat area (header + messages + input)
// Note: Chat uses its own internal header, not <PageHeader>

export const ChatSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <div className="flex-1 flex overflow-hidden">
      {/* Contact Sidebar (Desktop) */}
      <div className="hidden md:flex w-80 border-r border-border/40 flex-col bg-card/50">
        <div className="p-4 border-b border-border/40">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 flex items-center gap-3 rounded-xl">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Chat Header */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/30">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-6 overflow-auto">
          {[false, true, false, true, false].map((isRight, i) => (
            <div
              key={i}
              className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`space-y-2 ${isRight ? 'items-end' : 'items-start'} flex flex-col`}
              >
                <Skeleton
                  className={`h-14 md:h-16 w-[160px] md:w-[260px] ${
                    isRight
                      ? 'rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                      : 'rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
                  }`}
                />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/40 bg-card/30">
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
// ─── Member Portal ──────────────────────────────────────────────────────────

export const MemberDashboardSkeleton = () => {
  return (
    <div className="space-y-10 animate-pulse pb-20">
      <PageHeaderSkeleton />
      {/* ── Stat Cards: 1-col mobile / 2-col sm / 5-col lg ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-[2rem] p-5 sm:p-7 border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-2xl bg-muted/40" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Action Buttons ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
        <Skeleton className="h-12 w-40 rounded-2xl" />
        <Skeleton className="h-12 w-40 rounded-2xl" />
        <Skeleton className="h-12 w-36 rounded-2xl" />
      </div>

      {/* ── Main layout: single-col on mobile / 3-col on lg ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left col (spans 2 on lg) */}
        <div className="lg:col-span-2 space-y-8">
          {/* FinFlo Insights */}
          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-3 w-52 rounded" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-muted/40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-7 w-28 rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Cash Flow chart */}
          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-muted/40" />
            </div>
            <div className="h-[240px] sm:h-[300px] flex items-end gap-2 sm:gap-3 px-2">
              {[60, 85, 45, 92, 70, 55].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div
                    className="w-full bg-muted/40 rounded-t-xl"
                    style={{ height: `${h}%` }}
                  />
                  <Skeleton className="h-3 w-6 sm:w-8 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Loan Requests */}
          <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3 w-52 rounded hidden sm:block" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 sm:p-6 rounded-[2rem] border border-border/50 bg-muted/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Skeleton className="h-5 w-28 sm:w-32 rounded" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-36 sm:w-44 rounded" />
                      <Skeleton className="h-2 w-full rounded-full mt-2" />
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: Saving Goals — full width on mobile, sidebar on lg */}
        <div className="lg:col-span-1">
          <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </div>
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-[1.5rem] border border-border/40 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MemberInvestmentSkeleton = ({ count = 5 }) => {
  return (
    <>
      {/* ── Mobile: MemberActivityCard-style cards ─── */}
      <div className="p-4 space-y-4 md:hidden animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="bg-card/40 border border-border/40 rounded-[2rem] p-6 shadow-sm"
          >
            {/* Top row: icon + desc + amount */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-14 rounded" />
                  <Skeleton className="h-4 w-36 rounded" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-6 w-24 rounded ml-auto" />
                <Skeleton className="h-2 w-12 rounded ml-auto" />
              </div>
            </div>
            {/* Bottom 2-cell grid: date + portfolio */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-10 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-16 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: row-list ─────────────────────── */}
      <div className="hidden md:block divide-y divide-border/40 animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-44 rounded" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-14 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-right shrink-0">
              <Skeleton className="h-6 w-28 rounded ml-auto" />
              <Skeleton className="h-3 w-20 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export const MemberLoansSkeleton = ({ count = 4 }) => {
  return (
    <div className="p-6 sm:p-10 animate-pulse">
      {/* Mobile: single-column / Desktop: 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-8 rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-md shadow-sm"
          >
            {/* Header: icon block + status badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Principal + Term grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-7 w-28 rounded" />
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-8 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-8 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-border/30">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MemberTransactionsSkeleton = ({ count = 6 }) => {
  return (
    <>
      {/* ── Mobile: MemberActivityCard-style cards ─── */}
      <div className="p-4 space-y-4 md:hidden animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="bg-card/40 border border-border/40 rounded-[2rem] p-6 shadow-sm"
          >
            {/* Top row: icon + desc + amount */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="h-6 w-24 rounded ml-auto" />
                <Skeleton className="h-2 w-12 rounded ml-auto" />
              </div>
            </div>
            {/* Bottom 2-cell grid: date + portfolio */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-10 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <div className="bg-muted/30 rounded-2xl p-3 space-y-1.5">
                <Skeleton className="h-2.5 w-14 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: row-list ─────────────────────── */}
      <div className="hidden md:block divide-y divide-border/40 animate-pulse">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-right shrink-0">
              <Skeleton className="h-6 w-28 rounded ml-auto" />
              <Skeleton className="h-3 w-20 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export const MemberWalletSkeleton = () => (
  <div className="space-y-10 animate-in fade-in duration-200">
    <PageHeaderSkeleton />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* CC Hero Card */}
      <div className="lg:col-span-2 h-[320px] rounded-[3rem] bg-zinc-950/10 border border-border/40 p-8 flex flex-col justify-between relative overflow-hidden">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-16 w-64" />
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-14 w-32 rounded-2xl" />
            <Skeleton className="h-14 w-32 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Side Quick Metrics */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-card border border-border/50 p-8 rounded-[2.5rem] space-y-4"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Ledger Section */}
    <div className="bg-card rounded-[3rem] border border-border/50 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-6 sm:p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const MemberTransferSkeleton = () => (
  <div className="space-y-10 animate-in fade-in duration-200">
    <PageHeaderSkeleton />

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column - Transfer Controls */}
      <div className="lg:col-span-8 space-y-6">
        {/* Tabs */}
        <div className="flex p-1.5 bg-muted/30 rounded-2xl border border-border/40">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>

        {/* Form Card */}
        <div className="bg-card p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm min-h-[500px] space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl mt-8" />
          </div>
        </div>
      </div>

      {/* Right Column - Balance & Summary */}
      <div className="lg:col-span-4 space-y-6">
        {/* Balance Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-8 space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-48" />
          <div className="h-px bg-border/50 w-full my-4" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <RecentActivityListSkeleton count={3} />
        </div>
      </div>
    </div>
  </div>
);


export const RecentActivityListSkeleton = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="p-4 rounded-xl border border-border/30 space-y-3"
      >
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <div className="flex justify-between items-end">
          <div className="flex gap-2">
            <Skeleton className="h-2 w-12" />
            <Skeleton className="h-2 w-16" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const MemberInvestmentPageSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <PageHeaderSkeleton />
    <CardsSkeleton count={3} />
    <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-border/50 flex items-center justify-between bg-muted/20">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <MemberInvestmentSkeleton count={5} />
    </div>
  </div>
);

export const MemberLoansPageSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <PageHeaderSkeleton />
    </div>
    <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
      <div className="p-6 sm:p-10 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <MemberLoansSkeleton count={4} />
    </div>
  </div>
);

export const MemberActivityPageSkeleton = () => (
  <div className="space-y-10 animate-pulse pb-20">
    <PageHeaderSkeleton />
    <CardsSkeleton count={3} />
    <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
      <div className="p-6 sm:p-10 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex gap-4 flex-1">
            <Skeleton className="h-12 flex-1 max-w-md rounded-2xl" />
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <MemberTransactionsSkeleton count={6} />
    </div>
  </div>
);

export const MemberNotificationsPageSkeleton = () => (
  <div className="space-y-6 animate-pulse pb-10">
    <PageHeaderSkeleton />
    <div className="flex flex-col md:flex-row gap-4">
      <Skeleton className="h-14 flex-1 rounded-lg" />
      <Skeleton className="h-14 w-[180px] rounded-lg" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-border/10 bg-card/30 flex items-start gap-4"
        >
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-1/3 rounded-lg" />
              <Skeleton className="h-4 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
