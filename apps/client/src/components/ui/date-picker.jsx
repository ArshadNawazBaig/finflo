/* eslint-disable react/prop-types -- project convention: no propTypes */
import * as React from 'react';
import {
  format,
  parse,
  isValid,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const YEAR_GRID = 12; // years shown per page in the year view
const ISO = 'yyyy-MM-dd';

// Normalise the controlled value (Date | 'yyyy-MM-dd' string | null/'') → Date | null.
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const parsed = parse(String(value), ISO, new Date());
  return isValid(parsed) ? parsed : null;
}

/**
 * App-styled date picker — a field-shaped trigger plus a calendar in a popover,
 * built on the shared Popover primitive and date-fns (no native `<input type="date">`).
 *
 * Controlled: pass `value` as a Date or a 'yyyy-MM-dd' string; `onChange` is
 * called with the selected date as a 'yyyy-MM-dd' string (or '' when cleared),
 * which drops straight into existing string/FormData flows.
 *
 * @param {object} props
 * @param {Date|string|null} [props.value] - Selected date.
 * @param {(iso: string) => void} props.onChange - Receives 'yyyy-MM-dd' (or '').
 * @param {string} [props.placeholder] - Shown when no date is selected.
 * @param {boolean} [props.disabled]
 * @param {string} [props.id] - Wires an external label to the trigger.
 * @param {string} [props.className] - Extra classes on the trigger (e.g. height).
 * @param {'start'|'center'|'end'} [props.align] - Popover alignment.
 * @param {boolean} [props.allowClear] - Show an inline clear button (default true).
 * @param {Date} [props.minDate] - Disable days before this date.
 * @param {Date} [props.maxDate] - Disable days after this date.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  id,
  className,
  align = 'start',
  allowClear = true,
  minDate,
  maxDate,
}) {
  const selected = toDate(value);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => selected || new Date());
  // Drill-down view: 'days' → click header → 'years' → pick year → 'months' →
  // pick month → back to 'days'. Lets the user jump across years quickly.
  const [view, setView] = React.useState('days');
  const showClear = allowClear && selected && !disabled;

  // Follow the value when it changes from outside (e.g. a form reset).
  React.useEffect(() => {
    const d = toDate(value);
    if (d) setMonth(d);
  }, [value]);

  // Always reopen on the day grid.
  React.useEffect(() => {
    if (open) setView('days');
  }, [open]);

  const year = month.getFullYear();
  const yearGridStart = year - (((year % YEAR_GRID) + YEAR_GRID) % YEAR_GRID);

  // Return a copy of `d` with year/month replaced (day pinned to 1 so the month
  // anchor never rolls over, e.g. Jan 31 → Feb).
  const withYear = (d, y) => {
    const x = new Date(d);
    x.setDate(1);
    x.setFullYear(y);
    return x;
  };
  const withMonth = (d, m) => {
    const x = new Date(d);
    x.setDate(1);
    x.setMonth(m);
    return x;
  };

  const headerLabel =
    view === 'days'
      ? format(month, 'MMMM yyyy')
      : view === 'months'
        ? format(month, 'yyyy')
        : `${yearGridStart} – ${yearGridStart + YEAR_GRID - 1}`;

  const onHeaderClick = () =>
    setView((v) => (v === 'days' ? 'years' : v === 'years' ? 'days' : 'years'));

  const goPrev = () => {
    if (view === 'days') setMonth(subMonths(month, 1));
    else if (view === 'months') setMonth(withYear(month, year - 1));
    else setMonth(withYear(month, year - YEAR_GRID));
  };
  const goNext = () => {
    if (view === 'days') setMonth(addMonths(month, 1));
    else if (view === 'months') setMonth(withYear(month, year + 1));
    else setMonth(withYear(month, year + YEAR_GRID));
  };

  const yearOutOfRange = (y) =>
    (minDate && y < minDate.getFullYear()) ||
    (maxDate && y > maxDate.getFullYear());

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const isDisabledDay = (day) =>
    (minDate && day < startOfDayLocal(minDate)) ||
    (maxDate && day > endOfDayLocal(maxDate));

  const handleSelect = (day) => {
    if (isDisabledDay(day)) return;
    onChange?.(format(day, ISO));
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-left text-sm ring-offset-background transition-colors',
              'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              showClear && 'pr-9',
              open && 'border-primary/50 ring-2 ring-primary/20',
              className,
            )}
          >
            <CalendarIcon size={15} className="shrink-0 text-muted-foreground" />
            <span
              className={cn(
                'flex-1 truncate',
                !selected && 'text-muted-foreground',
              )}
            >
              {selected ? format(selected, 'dd MMM yyyy') : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear date"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <PopoverContent align={align} sideOffset={8} className="w-[17.5rem] p-3">
        {/* Header — chevrons + a clickable label that drills into months/years */}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onHeaderClick}
            title="Pick month / year"
            className="rounded-lg px-2 py-1 text-sm font-bold tracking-tight transition-colors hover:bg-accent"
          >
            {headerLabel}
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day view */}
        {view === 'days' && (
          <>
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="flex h-8 items-center justify-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const isSelected = selected && isSameDay(day, selected);
                const inMonth = isSameMonth(day, month);
                const today = isToday(day);
                const isOff = isDisabledDay(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isOff}
                    onClick={() => handleSelect(day)}
                    className={cn(
                      'mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                      isOff && 'cursor-not-allowed text-muted-foreground/30',
                      !isOff && !inMonth && 'text-muted-foreground/30 hover:bg-accent',
                      !isOff &&
                        inMonth &&
                        !isSelected &&
                        'text-foreground hover:bg-accent',
                      isSelected &&
                        'bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary',
                      today &&
                        !isSelected &&
                        'text-primary ring-1 ring-inset ring-primary/40',
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Month view — pick a month, then drop back to the day grid */}
        {view === 'months' && (
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {MONTHS.map((m, i) => {
              const active = i === month.getMonth();
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMonth(withMonth(month, i));
                    setView('days');
                  }}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'text-foreground hover:bg-accent',
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        )}

        {/* Year view — pick a year, then advance to the month view */}
        {view === 'years' && (
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {Array.from({ length: YEAR_GRID }, (_, i) => yearGridStart + i).map(
              (y) => {
                const active = y === year;
                const off = yearOutOfRange(y);
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={off}
                    onClick={() => {
                      setMonth(withYear(month, y));
                      setView('months');
                    }}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                      off && 'cursor-not-allowed text-muted-foreground/30',
                      !off &&
                        active &&
                        'bg-primary text-primary-foreground shadow-sm shadow-primary/30',
                      !off && !active && 'text-foreground hover:bg-accent',
                    )}
                  >
                    {y}
                  </button>
                );
              },
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Local-time day boundaries so min/max comparisons ignore the time component.
function startOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default DatePicker;
