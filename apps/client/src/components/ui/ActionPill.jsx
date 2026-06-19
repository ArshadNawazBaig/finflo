/* eslint-disable react/prop-types -- project convention: no propTypes */
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ActionPill — the horizontal quick-action pill used across the dashboards:
 * a solid-colour icon circle, label + description, and a corner arrow, inside a
 * rounded-full strip. Designed to sit in a `flex flex-wrap gap-3` row (each pill
 * is `flex-1 min-w-[240px]`).
 *
 * Pass `active` to render the filled/selected state — this lets the same pill be
 * used as a mutually-exclusive selector (e.g. the TellerMode action picker).
 *
 * Built on a plain <button> (not the ghost Button variant) so the active fill
 * never gets repainted by `hover:bg-accent`.
 *
 * @param {ReactNode} icon        - lucide icon element (caller sets its size)
 * @param {string}    label       - bold title
 * @param {string}    description - muted subtitle (optional)
 * @param {string}    iconBg      - solid bg colour class for the icon circle, and
 *                                  the pill fill when active (e.g. 'bg-emerald-500')
 * @param {string}    accent      - arrow text colour class when idle (e.g. 'text-emerald-500')
 * @param {boolean}   active      - selected/filled state
 */
const ActionPill = ({
  icon,
  label,
  description,
  iconBg = 'bg-primary',
  accent = 'text-primary',
  active = false,
  onClick,
  className,
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group relative overflow-hidden flex-1 min-w-[240px] flex items-center gap-3.5 rounded-full border p-2 text-left transition-all duration-300 hover:-translate-y-0.5',
      active
        ? cn(iconBg, 'border-transparent text-white shadow-lg shadow-black/10')
        : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/[0.1] hover:shadow-[0_12px_30px_-12px_rgba(15,23,42,0.15)]',
      className,
    )}
    {...props}
  >
    {/* Left icon circle */}
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-105',
        active ? 'bg-white/20' : iconBg,
      )}
    >
      {icon}
    </div>

    {/* Center text */}
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <p
        className={cn(
          'text-[13px] font-extrabold tracking-tight truncate leading-tight',
          active ? 'text-white' : 'text-slate-900 dark:text-white',
        )}
      >
        {label}
      </p>
      {description && (
        <p
          className={cn(
            'text-[10px] font-medium truncate mt-0.5 leading-tight',
            active ? 'text-white/70' : 'text-slate-400 dark:text-slate-500',
          )}
        >
          {description}
        </p>
      )}
    </div>

    {/* Right corner arrow */}
    <div
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300',
        active
          ? 'bg-white/20 text-white'
          : cn(
              'bg-slate-50 dark:bg-white/[0.04] group-hover:bg-primary/10',
              accent,
            ),
      )}
    >
      <ArrowUpRight
        size={13}
        strokeWidth={2.5}
        className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </div>
  </button>
);

export default ActionPill;
