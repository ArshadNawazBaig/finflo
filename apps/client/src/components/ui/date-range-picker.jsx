/* eslint-disable react/prop-types -- project convention: no propTypes */
'use client';

import * as React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, setYear } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDayPicker } from 'react-day-picker';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DateRangePicker({ className, date, setDate }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState(date);

  // Sync tempDate when popover opens or date prop changes externally
  React.useEffect(() => {
    if (isOpen) {
      setTempDate(date);
    }
  }, [isOpen, date]);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'relative min-w-[250px] justify-start text-left font-bold border-white/10 bg-white/5 backdrop-blur-xl rounded-[1.25rem] h-12 text-[10px] uppercase tracking-widest transition-all duration-500 hover:bg-white/10 group overflow-hidden',
              !date && 'text-muted-foreground',
            )}
          >
            {/* Animated background gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div className="relative flex items-center w-full">
              <div className="bg-primary/20 p-2 rounded-xl mr-3 group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-500 ">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>

              <div className="flex flex-col flex-1">
                <span className="text-[9px] text-primary/70 mb-0.5 font-black uppercase tracking-[0.2em]">
                  Analytics Period
                </span>
                {date && date.from ? (
                  date.to ? (
                    <span className="flex items-center gap-2 text-foreground font-black tracking-tight">
                      <span>{format(new Date(date.from), 'MMM dd, yyyy')}</span>
                      <span className="text-primary/30">—</span>
                      <span>{format(new Date(date.to), 'MMM dd, yyyy')}</span>
                    </span>
                  ) : (
                    <span className="text-foreground font-black tracking-tight">
                      {format(new Date(date.from), 'MMM dd, yyyy')}
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground/60 font-black tracking-tight">
                    Select range...
                  </span>
                )}
              </div>

              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground/50 transition-transform duration-500 group-hover:text-primary/70',
                  isOpen && 'rotate-180',
                )}
              />
            </div>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 border-border bg-popover rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
          align="end"
          sideOffset={8}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.to || tempDate?.from}
              selected={tempDate}
              onSelect={setTempDate}
              numberOfMonths={1}
              fromYear={2015}
              toYear={2040}
              className="p-4"
              classNames={{
                root: 'w-full',
                months: 'flex flex-col',
                month: 'space-y-4',
                caption_dropdowns: 'flex items-center gap-1 mx-auto',
                dropdown:
                  'px-2 py-1 h-8 bg-accent/40 border-none text-[13px] font-bold text-foreground focus:ring-1 focus:ring-primary/30 cursor-pointer hover:bg-accent/60 rounded-md transition-all outline-none',
                nav: 'flex items-center gap-1',
                button_previous: cn(
                  'h-8 w-8 bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all flex items-center justify-center p-0 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20',
                ),
                button_next: cn(
                  'h-8 w-8 bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all flex items-center justify-center p-0 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20',
                ),
                month_grid: 'w-full border-collapse',
                weekdays: 'flex mb-2',
                weekday:
                  'text-muted-foreground w-9 font-medium text-[10px] text-center uppercase tracking-widest',
                week: 'flex w-full mt-1',
                day: 'h-9 w-9 p-0 relative flex items-center justify-center',
                day_button: cn(
                  buttonVariants({ variant: 'ghost' }),
                  'h-8 w-8 p-0 font-medium text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-full transition-all aria-selected:hover:!text-white',
                ),
                range_start:
                  'day-range-start !rounded-full bg-primary !text-white font-bold z-30 shadow-lg shadow-primary/20',
                range_end:
                  'day-range-end !rounded-full bg-primary !text-white font-bold z-30 shadow-lg shadow-primary/20',
                range_middle:
                  'day-range-middle !bg-primary/15 !text-primary !rounded-none after:absolute after:inset-0 after:bg-primary/10 after:-z-10',
                selected:
                  'bg-primary !text-white hover:bg-primary hover:!text-white',
                today:
                  'after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full',
                outside: 'text-muted-foreground/30 opacity-40',
                disabled: 'text-muted-foreground/20 opacity-20',
                hidden: 'invisible',
                active: '!text-white',
              }}
              components={{
                Nav: () => null,
                MonthCaption: (props) => {
                  const { goToMonth, previousMonth, nextMonth } =
                    useDayPicker();
                  const years = Array.from(
                    { length: 2041 - 2015 },
                    (_, i) => 2015 + i,
                  );

                  return (
                    <div className="flex items-center justify-between mb-6 h-12 px-2 relative z-50 bg-accent/10 rounded-2xl border border-border/50">
                      <Button
                        variant="ghost"
                        className="h-9 px-2 rounded-xl hover:bg-primary hover:text-white text-primary transition-all duration-300 bg-white/10 backdrop-blur-md shadow-sm active:scale-95 flex items-center gap-2 group"
                        disabled={!previousMonth}
                        onClick={() =>
                          previousMonth && goToMonth(previousMonth)
                        }
                      >
                        <ChevronLeft className="h-4 w-4 stroke-[3px] group-hover:-translate-x-0.5 transition-transform" />
                        {/* <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                          Back
                        </span> */}
                      </Button>

                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium capitalize tracking-[0.2em] text-foreground">
                          {format(props.calendarMonth.date, 'MMMM')}
                        </span>

                        <Select
                          value={props.calendarMonth.date
                            .getFullYear()
                            .toString()}
                          onValueChange={(value) => {
                            const newDate = setYear(
                              props.calendarMonth.date,
                              parseInt(value),
                            );
                            goToMonth(newDate);
                          }}
                        >
                          <SelectTrigger
                            className="h-9 w-[70px] bg-primary/10 hover:bg-primary/20 border-primary/30 border text-[12px] font-black uppercase tracking-widest rounded-xl px-4 focus:ring-primary/50 flex items-center justify-center gap-2 text-foreground transition-all duration-300 pointer-events-auto"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-popover border-border min-w-[100px]">
                            {years.map((y) => (
                              <SelectItem
                                key={y}
                                value={y.toString()}
                                className="text-[12px] font-bold uppercase tracking-widest focus:bg-primary focus:text-white cursor-pointer"
                              >
                                {y}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="ghost"
                        className="h-9 px-2 rounded-xl hover:bg-primary hover:text-white text-primary transition-all duration-300 bg-white/10 backdrop-blur-md shadow-sm active:scale-95 flex items-center group"
                        disabled={!nextMonth}
                        onClick={() => nextMonth && goToMonth(nextMonth)}
                      >
                        {/* <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                          Next
                        </span> */}
                        <ChevronRight className="h-4 w-4 stroke-[3px] group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  );
                },
              }}
            />

            <div className="px-2 py-3 bg-accent/20 border-t border-border gap-1 flex items-center justify-between">
              <div className="bg-background px-2 py-1 rounded-full border border-border shadow-sm">
                <span className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">
                  {tempDate?.from
                    ? format(tempDate.from, 'MMM dd, yyyy')
                    : '...'}
                  <span className="mx-2 text-muted-foreground/50">→</span>
                  {tempDate?.to ? format(tempDate.to, 'MMM dd, yyyy') : '...'}
                </span>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-full px-5 h-8 transition-all active:scale-95 shadow-lg shadow-primary/10"
                onClick={() => {
                  if (tempDate?.from && tempDate?.to) {
                    setDate(tempDate);
                  }
                  setIsOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </motion.div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
