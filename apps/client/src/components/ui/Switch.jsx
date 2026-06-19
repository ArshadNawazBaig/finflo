/* eslint-disable react/prop-types -- project convention: no propTypes */
import { cn } from '@/lib/utils';

/**
 * Switch — the app-wide toggle. Controlled: pass `checked` and `onCheckedChange`.
 *
 * Clean shadcn geometry: an h-6/w-11 track with a 2px transparent border inset and
 * an h-5/w-5 thumb that travels flush edge-to-edge (translate-x-0 ↔ translate-x-5),
 * so the knob fills the track height and never looks half-sized or off-centre.
 *
 * @param {boolean}  checked
 * @param {Function} onCheckedChange - called with the next boolean value
 * @param {boolean}  disabled
 * @param {string}   checkedClassName - "on" track colour (default 'bg-primary');
 *                   override for semantic toggles (e.g. 'bg-emerald-500' for active,
 *                   'bg-rose-600' for a destructive/maintenance switch)
 */
const Switch = ({
  checked = false,
  onCheckedChange,
  disabled = false,
  checkedClassName = 'bg-primary',
  className,
  ...props
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onCheckedChange?.(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      checked ? checkedClassName : 'bg-slate-200 dark:bg-white/[0.12]',
      className,
    )}
    {...props}
  >
    <span
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-300',
        checked ? 'translate-x-5' : 'translate-x-0',
      )}
    />
  </button>
);

export default Switch;
