import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  AlertCircle,
  MessageSquare,
  Mail,
} from 'lucide-react';
import { formatPKR } from '@/lib/utils';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';
import Tooltip from '@/components/ui/Tooltip';

const RepaymentCalendar = ({ upcomingPayments = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const paymentsByDate = useMemo(() => {
    const map = {};
    upcomingPayments.forEach((payment) => {
      const dateKey = format(new Date(payment.dueDate), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(payment);
    });
    return map;
  }, [upcomingPayments]);

  const selectedPayments =
    paymentsByDate[format(selectedDate, 'yyyy-MM-dd')] || [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Calendar Section */}
      <div className="flex-1 bg-card/30 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-4 sm:p-6 shadow-sm overflow-hidden flex flex-col">
        <header className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-xl font-black tracking-tight text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
              Payment Schedule
            </p>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-background rounded-xl transition-all active:scale-90"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-background rounded-xl transition-all active:scale-90"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 border-b border-border/50 pb-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayPayments = paymentsByDate[dateKey] || [];
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const hasOverdue = dayPayments.some((p) => p.isOverdue);

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative h-20 xl:h-24 p-2 rounded-3xl transition-all group flex flex-col items-center justify-start gap-1
                  ${!isCurrentMonth ? 'opacity-20 pointer-events-none' : 'hover:bg-primary/5'}
                  ${isSelected ? 'bg-primary/10 ring-2 ring-primary/20 ring-inset shadow-inner shadow-primary/5' : ''}
                `}
              >
                <span
                  className={`
                  text-sm font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all
                  ${isToday(day) ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : ''}
                  ${isSelected && !isToday(day) ? 'text-primary' : 'text-foreground/70'}
                `}
                >
                  {format(day, 'd')}
                </span>

                {dayPayments.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 mt-1 max-w-[40px]">
                    {dayPayments.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${hasOverdue ? 'bg-rose-500 animate-pulse' : 'bg-primary'}`}
                      />
                    ))}
                    {dayPayments.length > 3 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                )}

                {dayPayments.length > 0 && (
                  <p className="text-[9px] font-black text-primary/60 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {dayPayments.length} Due
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Details Side-pane */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="flex-1 bg-card/30 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-4 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-black text-sm tracking-tight capitalize">
                {format(selectedDate, 'EEEE')}
              </h4>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {format(selectedDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Bell size={18} className="text-muted-foreground" />
            </div>
          </div>

          <div className="flex-1 space-y-4 py-8 -my-8 px-1">
            {selectedPayments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <AlertCircle size={32} className="mb-3 text-muted-foreground" />
                <p className="text-xs font-bold">No payments due</p>
                <p className="text-[10px]">Rest day for your portfolio</p>
              </div>
            ) : (
              selectedPayments.map((p) => (
                <div
                  key={p._id}
                  className={`
                    p-3 sm:p-4 rounded-3xl border border-border/50 group transition-all
                    ${p.isOverdue ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20' : 'bg-background/40 hover:bg-primary/5 hover:border-primary/20'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p
                      className={`text-xs font-black uppercase tracking-widest ${p.isOverdue ? 'text-rose-500' : 'text-primary'}`}
                    >
                      {p.isOverdue
                        ? 'Overdue!'
                        : `Installment #${p.installment}`}
                    </p>
                    <p className="text-sm font-black tabular-nums">
                      {formatPKR(p.amount)}
                    </p>
                  </div>
                  <h5 className="font-bold text-sm mb-1">{p.customer?.name}</h5>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-[10px] text-muted-foreground font-medium truncate">
                      Loan Settlement
                    </p>
                    <div className="flex items-center gap-1">
                      <Tooltip content="Send WhatsApp Reminder" position="top">
                        <a
                          href={generateWhatsAppLink(
                            p.customer?.phone || '',
                            p.customer?.name || '',
                            p.amount,
                            p.dueDate,
                            p.isOverdue,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-2 rounded-xl transition-all ${p.isOverdue ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-primary/10 text-primary'}`}
                        >
                          <MessageSquare size={16} />
                        </a>
                      </Tooltip>
                      <Tooltip content="Send Email Reminder" position="top">
                        <a
                          href={generateEmailLink(
                            p.customer?.email || '',
                            p.customer?.name || '',
                            p.amount,
                            p.dueDate,
                            p.isOverdue,
                          )}
                          className={`p-2 rounded-xl transition-all ${p.isOverdue ? 'hover:bg-rose-500/20 text-rose-500' : 'hover:bg-primary/10 text-primary'}`}
                        >
                          <Mail size={16} />
                        </a>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-border/20">
            <div className="flex justify-between items-center bg-primary/10 p-3 sm:p-4 rounded-2xl border border-primary/20">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                  Total Due Today
                </p>
                <p className="text-lg font-black text-primary">
                  {formatPKR(
                    selectedPayments.reduce((sum, p) => sum + p.amount, 0),
                  )}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 font-black text-xs">
                {selectedPayments.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepaymentCalendar;
