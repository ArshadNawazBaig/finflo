import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  PiggyBank,
  Landmark,
  CalendarDays,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn, formatCurrency } from '@/lib/utils';

const EVENT_CONFIG = {
  emi: {
    color: 'bg-red-500',
    dotColor: 'bg-red-500',
    textColor: 'text-red-600',
    label: 'Loan EMI',
    icon: CreditCard,
  },
  scheduled: {
    color: 'bg-emerald-500',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    label: 'Scheduled',
    icon: PiggyBank,
  },
  maturity: {
    color: 'bg-blue-500',
    dotColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    label: 'Maturity',
    icon: Landmark,
  },
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const FinancialCalendar = ({
  apiUrl = '/members/portal/calendar',
  branchId,
  className,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: monthStr };
      if (branchId) params.branchId = branchId;
      const { data } = await api.get(apiUrl, { params });
      setEvents(data || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, monthStr, branchId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigate = (direction) => {
    setSelectedDate(null);
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  };

  const goToToday = () => {
    setSelectedDate(null);
    setCurrentDate(new Date());
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const selectedDateStr = selectedDate
    ? `${MONTHS[month]} ${selectedDate}, ${year}`
    : null;

  return (
    <div
      className={cn(
        'bg-card rounded-[2rem] border border-border/50 overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary ">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">
              {MONTHS[month]} {year}
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              {events.length} event{events.length !== 1 ? 's' : ''} this month
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary/70 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Main body: side-by-side calendar + detail panel */}
      <div className="flex flex-col sm:flex-row">
        {/* Left: Calendar grid */}
        <div
          className={cn(
            'flex-1 min-w-0',
            selectedDate && 'sm:border-r border-border/40',
          )}
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 px-4">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[9px] font-black uppercase tracking-wider text-muted-foreground/50 py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            className={cn(
              'grid grid-cols-7 px-4 pb-2',
              loading && 'opacity-50',
            )}
          >
            {cells.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const dateStr = day
                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : '';
              const isToday = dateStr === todayStr;
              const isSelected = day === selectedDate;
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={i}
                  disabled={!day}
                  onClick={() =>
                    day && setSelectedDate(day === selectedDate ? null : day)
                  }
                  className={cn(
                    'relative py-8 flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all',
                    !day && 'invisible',
                    day && 'hover:bg-muted/30 cursor-pointer',
                    isToday && !isSelected && 'bg-primary/5 text-primary',
                    isSelected &&
                      'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90',
                  )}
                >
                  <span>{day}</span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5">
                      {[...new Set(dayEvents.map((e) => e.type))]
                        .slice(0, 3)
                        .map((type) => (
                          <div
                            key={type}
                            className={cn(
                              'w-1 h-1 rounded-full',
                              isSelected
                                ? 'bg-white'
                                : EVENT_CONFIG[type]?.dotColor || 'bg-gray-400',
                            )}
                          />
                        ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-2 border-t flex items-center gap-4 flex-wrap">
            {Object.entries(EVENT_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Event details side panel */}
        {selectedDate && (
          <div className="sm:w-[400px] shrink-0 border-t sm:border-t-0 bg-muted/5">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-border/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                {selectedDateStr}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {selectedEvents.length} event
                {selectedEvents.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Events list */}
            <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
              {selectedEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays
                    size={24}
                    className="mx-auto text-muted-foreground/20 mb-2"
                  />
                  <p className="text-[10px] text-muted-foreground font-bold">
                    No events on this day
                  </p>
                </div>
              ) : (
                selectedEvents.map((event) => {
                  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.emi;
                  const Icon = config.icon;
                  return (
                    <div
                      key={event.id}
                      className="p-3 rounded-xl bg-card border border-border/30 space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            `${config.color}/10`,
                          )}
                        >
                          <Icon size={14} className={config.textColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold truncate leading-tight">
                            {event.title}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {config.label}
                          </p>
                        </div>
                      </div>
                      {event.amount && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/20">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            Amount
                          </span>
                          <span
                            className={cn(
                              'text-xs font-black',
                              config.textColor,
                            )}
                          >
                            {formatCurrency(event.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialCalendar;
