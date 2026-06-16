/* eslint-disable react/prop-types -- project convention: no propTypes */
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * PillSelect — the rounded-pill dropdown used across the app for filters/selectors
 * (branch filter, status filter, sort, …). A Radix Select styled as a pill, with an
 * optional leading icon and the standard checkmark menu.
 *
 * Pass `options` for the common case, or `children` (raw <SelectItem>s) for custom
 * item content. Omit `icon` for an icon-less pill.
 *
 * @param {string}    value
 * @param {Function}  onValueChange
 * @param {Array}     options          - [{ value, label, icon? }]
 * @param {ReactNode} icon             - leading icon in the trigger (optional)
 * @param {string}    placeholder
 * @param {boolean}   disabled
 * @param {string}    className        - extra classes on the trigger (e.g. 'w-48')
 * @param {string}    contentClassName - extra classes on the menu
 * @param {ReactNode} children         - raw <SelectItem>s (overrides `options`)
 */
const PillSelect = ({
  value,
  onValueChange,
  options = [],
  icon,
  placeholder,
  disabled,
  className,
  contentClassName,
  children,
  ...props
}) => (
  <Select
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    {...props}
  >
    <SelectTrigger
      className={cn(
        'h-11 gap-2 rounded-full border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] px-4 text-sm font-semibold focus:ring-0',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && (
          <span className="flex shrink-0 items-center text-slate-400">
            {icon}
          </span>
        )}
        <SelectValue placeholder={placeholder} />
      </div>
    </SelectTrigger>
    <SelectContent
      className={cn(
        'rounded-2xl border-slate-100 dark:border-white/[0.06]',
        contentClassName,
      )}
    >
      {children ||
        options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="rounded-xl">
            {opt.icon ? (
              <span className="flex items-center gap-2">
                <span className="flex shrink-0 items-center">{opt.icon}</span>
                {opt.label}
              </span>
            ) : (
              opt.label
            )}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
);

export default PillSelect;
