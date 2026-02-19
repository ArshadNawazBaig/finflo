import React from 'react';
import { Mail, Calendar, AlertCircle, Info, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

const CommunicationLogs = ({ reminders = [] }) => {
  if (reminders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm text-center py-20 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-muted/10 rounded-2xl">
          <Mail className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
            No Automated Correspondence
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-1 max-w-[200px] mx-auto">
            The ACE engine hasn't dispatched any automated alerts for this loan
            yet.
          </p>
        </div>
      </div>
    );
  }

  const sortedReminders = [...reminders].sort(
    (a, b) => new Date(b.sentAt) - new Date(a.sentAt),
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tighter">
            Communication History
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Log of automated reminders and alerts sent by ACE.
          </p>
        </div>
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Mail className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        {sortedReminders.map((log, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
          >
            <div className="flex items-center gap-5">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
                  log.type === 'upcoming'
                    ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                    : 'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white',
                )}
              >
                {log.type === 'upcoming' ? (
                  <Info size={22} />
                ) : (
                  <AlertCircle size={22} />
                )}
              </div>
              <div>
                <div className="text-sm font-black tracking-tight flex items-center gap-2">
                  {log.type === 'upcoming'
                    ? 'Payment Reminder'
                    : 'Overdue Alert'}
                  <span className="text-[10px] font-black py-0.5 px-1.5 rounded-md bg-muted/20 text-muted-foreground uppercase flex items-center gap-1">
                    <Hash size={8} /> {log.installmentNumber}
                  </span>
                </div>
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                  <Calendar size={10} /> {new Date(log.sentAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  'text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border',
                  log.type === 'upcoming'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20',
                )}
              >
                Email Sent
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunicationLogs;
