import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Calendar,
  History,
  PieChart,
  Target,
  FileText,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import { generateTransactionReceipt } from '@/lib/pdfExportUtils';
import { Button } from '@/components/ui/button';

const MemberActivityCard = ({ activity, member }) => {
  const balanceAfter = activity.metadata?.balanceAfter || activity.balanceAfter;

  // Determine display style based on category AND type
  const getStyle = (category, type) => {
    const isCredit = isCreditType(type);

    if (category === 'profit')
      return {
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10 text-emerald-600',
        sign: '+',
        icon: <PieChart size={24} />,
      };
    if (category === 'goal')
      return {
        color: 'text-indigo-600',
        bg: 'bg-indigo-500/10 text-indigo-600',
        sign: '-',
        icon: <Target size={24} />,
      };
    if (category === 'repayment')
      return {
        color: 'text-amber-600',
        bg: 'bg-amber-500/10 text-amber-600',
        sign: '-',
        icon: <FileText size={24} />,
      };

    // fallback / default to type (includes 'investment' category)
    if (isCredit) {
      return {
        color: category === 'investment' ? 'text-primary' : 'text-emerald-600',
        bg:
          category === 'investment'
            ? 'bg-primary/10 text-primary'
            : 'bg-emerald-500/10 text-emerald-600',
        sign: '+',
        icon:
          category === 'investment' ? (
            <TrendingUp size={24} />
          ) : (
            <ArrowUpRight size={24} />
          ),
      };
    } else {
      return {
        color: 'text-rose-600',
        bg: 'bg-rose-500/10 text-rose-600',
        sign: '-',
        icon: <ArrowDownLeft size={24} />,
      };
    }
  };

  const style = getStyle(activity.category, activity.type);

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 group active:scale-[0.98]">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'min-h-12 min-w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110',
              style.bg,
            )}
          >
            {style.icon}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[9px] uppercase tracking-[0.2em] text-primary/80 mb-1">
              {activity.category || activity.type}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-foreground leading-tight tracking-tight capitalize">
                {activity.description ||
                  (activity.type === 'deposit'
                    ? 'Activity Deposit'
                    : 'Activity Withdrawal')}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'font-black text-xs tracking-tighter tabular-nums',
              style.color,
            )}
          >
            {style.sign}
            {formatCurrency(activity.amount)}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-black opacity-40">
            Amount
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-muted/30 rounded-2xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
            <Calendar size={10} />
            Date
          </div>
          <div className="font-bold text-[11px] text-foreground">
            {format(new Date(activity.date), 'MMM d, yyyy')}
          </div>
        </div>

        {balanceAfter && (
          <div className="bg-muted/30 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              <History size={10} />
              Portfolio
            </div>
            <div className="font-bold text-[11px] text-primary tabular-nums">
              {formatCurrency(balanceAfter)}
            </div>
          </div>
        )}

        {/* Sender / Recipient */}
        {(activity.type === 'transfer_receive' ||
          activity.type === 'transfer_send') && (
          <div className="bg-muted/30 rounded-2xl p-3 flex flex-col gap-1 col-span-2">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              {activity.type === 'transfer_receive' ? (
                <ArrowDownLeft size={10} />
              ) : (
                <ArrowUpRight size={10} />
              )}
              {activity.type === 'transfer_receive' ? 'From' : 'To'}
            </div>
            <div className="font-bold text-[11px] text-foreground truncate capitalize">
              {activity.type === 'transfer_receive'
                ? activity.metadata?.senderName ||
                  activity.description?.replace(/transfer from /i, '')
                : activity.metadata?.recipientName ||
                  activity.description?.replace(/transfer to /i, '')}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-bold text-[11px] text-primary">Status</span>
        <div className="flex items-center gap-2">
          {activity.status && (
            <div
              className={cn(
                'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border leading-none transition-all',
                activity.status === 'Completed' &&
                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                activity.status === 'Pending' &&
                  'bg-amber-500/10 text-amber-600 border-amber-500/20',
                activity.status === 'Failed' &&
                  'bg-rose-500/10 text-rose-600 border-rose-500/20',
              )}
            >
              <span
                className={cn(
                  'w-1 h-1 rounded-full',
                  activity.status === 'Completed' && 'bg-emerald-500',
                  activity.status === 'Pending' && 'bg-amber-500 animate-pulse',
                  activity.status === 'Failed' && 'bg-rose-500',
                )}
              />
              {activity.status}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() =>
              generateTransactionReceipt({
                member,
                type: activity.type,
                amount: activity.amount,
                description: activity.description,
                date: activity.date,
                balanceAfter: activity.metadata?.balanceAfter,
                referenceId: activity._id,
                accountType: 'current',
              })
            }
            className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all active:scale-95"
          >
            <Download size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MemberActivityCard;
