/* eslint-disable react/prop-types -- project convention: no propTypes */
import { ChevronRight, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * SearchResultsMenu — the shared dropdown panel for member/entity search menus
 * across the app (TellerMode, loan/transfer pickers, …).
 *
 * It owns BOTH the loading skeleton and the result rows and renders them with the
 * exact same row geometry (gap-3 p-3 rounded-2xl, ~40px round leading, tight
 * title/subtitle), so the skeleton and the live results never look different.
 *
 * Map each result to a row via the accessor props; `renderLeading` returns the
 * avatar/icon node (keep it ~h-10 w-10 + round to match the skeleton placeholder).
 *
 * @param {boolean}  open
 * @param {boolean}  loading       - show the skeleton instead of rows
 * @param {Array}    results
 * @param {Function} onSelect      - (result) => void
 * @param {Function} renderLeading - (result) => ReactNode (avatar/icon)
 * @param {Function} getTitle      - (result) => string   (default r.title)
 * @param {Function} getSubtitle   - (result) => string   (default r.subtitle)
 * @param {Function} getKey        - (result, i) => key
 * @param {Function} isActive      - (result) => boolean  (selected → check + tint)
 * @param {string}   query         - used in the default empty message
 * @param {string}   emptyMessage  - overrides the empty-state text
 * @param {number}   skeletonCount - skeleton rows (default 3)
 * @param {string}   className     - positioning/animation on the panel
 */
const Row = ({ leading, title, subtitle, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all group',
      active ? 'bg-primary/5' : 'hover:bg-primary/5',
    )}
  >
    {leading && <div className="shrink-0">{leading}</div>}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-black capitalize truncate group-hover:text-primary transition-colors">
        {title}
      </p>
      {subtitle ? (
        <p className="text-[9px] font-bold text-muted-foreground/60 capitalize tracking-widest truncate">
          {subtitle}
        </p>
      ) : null}
    </div>
    {active ? (
      <Check size={15} className="shrink-0 text-primary" />
    ) : (
      <ChevronRight
        size={14}
        className="shrink-0 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all"
      />
    )}
  </button>
);

const SkeletonRows = ({ count }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-2 w-32 rounded" />
        </div>
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
    ))}
  </div>
);

const SearchResultsMenu = ({
  open = true,
  loading = false,
  results = [],
  onSelect,
  renderLeading,
  getTitle = (r) => r.title,
  getSubtitle = (r) => r.subtitle,
  getKey,
  isActive,
  query = '',
  emptyMessage,
  skeletonCount = 3,
  className,
}) => {
  const showEmpty = !loading && results.length === 0;
  // Nothing to render: not open, or empty with no message to show.
  if (!open) return null;
  if (showEmpty && !emptyMessage && !query) return null;

  return (
    <div
      className={cn(
        'p-2 bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] overflow-hidden',
        className,
      )}
    >
      <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
        {loading ? (
          <SkeletonRows count={skeletonCount} />
        ) : showEmpty ? (
          <p className="px-4 py-6 text-center text-[11px] font-bold text-muted-foreground/60">
            {emptyMessage || `No results for "${query}"`}
          </p>
        ) : (
          results.map((r, i) => (
            <Row
              key={getKey ? getKey(r, i) : (r.id ?? r._id ?? i)}
              leading={renderLeading?.(r)}
              title={getTitle(r)}
              subtitle={getSubtitle(r)}
              active={isActive?.(r)}
              onClick={() => onSelect?.(r)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SearchResultsMenu;
