import { formatCurrency, capitalize } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Wallet,
  Calendar,
  History,
  PieChart,
  Target,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MemberActivityCard = ({ activity }) => {
  const balanceAfter = activity.metadata?.balanceAfter || activity.balanceAfter;

  // Determine display style based on category AND type
  const getStyle = (category, type) => {
    const isCredit = [
      'deposit',
      'transfer_receive',
      'external_receive',
    ].includes(type);

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
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110',
              style.bg,
            )}
          >
            {style.icon}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[10px] uppercase tracking-widest text-primary mb-0.5">
              {activity.category || activity.type}
            </span>
            <span className="font-bold text-sm text-foreground leading-tight">
              {activity.description ||
                (activity.type === 'deposit'
                  ? 'Activity Deposit'
                  : 'Activity Withdrawal')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'font-black text-xl tracking-tighter tabular-nums',
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
      </div>
    </div>
  );
};

export default MemberActivityCard;
