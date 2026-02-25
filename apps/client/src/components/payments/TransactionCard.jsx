import { formatCurrency, capitalize } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Receipt,
  User,
  ArrowRightLeft,
  TrendingUp,
  ArrowDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TransactionCard = ({ transaction }) => {
  const isIncome = transaction.type === 'income';

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center',
              isIncome
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-rose-500/10 text-rose-600',
            )}
          >
            {isIncome ? <TrendingUp size={20} /> : <ArrowDown size={20} />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground capitalize">
              {transaction.category.replace(/_/g, ' ')}
            </span>
            {transaction.category === 'salary' && transaction.referenceId && (
              <Link
                to={`/team/${transaction.referenceId._id || transaction.referenceId}`}
                className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-[8px] font-black uppercase tracking-tight text-primary hover:bg-primary/20 transition-all w-fit"
              >
                <User size={8} />
                {transaction.referenceId.name}
              </Link>
            )}
            <span className="text-[10px] text-muted-foreground font-medium">
              {format(new Date(transaction.date), 'MMM d, yyyy • hh:mm a')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              'font-black text-base tabular-nums',
              isIncome ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            {transaction.type}
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-3 space-y-2 mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <User size={12} />
            Related To
          </span>
          <span className="font-bold text-foreground truncate ml-4">
            {capitalize(
              transaction.customer?.name ||
                transaction.member?.name ||
                (transaction.category === 'salary' && 'Branch Operations') ||
                'System',
            )}
          </span>
        </div>
        {(transaction.loan || transaction.category === 'repayment') && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Receipt size={12} />
              Loan Ref
            </span>
            <span className="font-bold text-primary font-mono bg-primary/5 px-1.5 py-0.5 rounded">
              {transaction.loan?._id?.slice(-6).toUpperCase() || 'N/A'}
            </span>
          </div>
        )}
      </div>

      {(transaction.description || transaction.notes) && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground/80 font-medium ">
            "{transaction.description || transaction.notes}"
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;
