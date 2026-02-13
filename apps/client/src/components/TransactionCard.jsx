import { formatPKR, capitalize } from '@/lib/utils';
import { format } from 'date-fns';
import { Receipt, Calendar, User, ArrowRightLeft } from 'lucide-react';

const TransactionCard = ({ transaction }) => {
  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <ArrowRightLeft size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground">
              Payment Received
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {format(new Date(transaction.date), 'MMM d, yyyy • hh:mm a')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-emerald-600 font-black text-base">
            {formatPKR(transaction.amount)}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            Amount
          </div>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-3 space-y-2 mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <User size={12} />
            Customer
          </span>
          <span className="font-bold text-foreground truncate ml-4">
            {capitalize(transaction.customer?.name || 'Unknown')}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Receipt size={12} />
            Loan Ref
          </span>
          <span className="font-bold text-primary font-mono bg-primary/5 px-1.5 py-0.5 rounded">
            {transaction.loan?._id?.slice(-6).toUpperCase() || 'N/A'}
          </span>
        </div>
      </div>

      {transaction.notes && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground/80 font-medium ">
            "{transaction.notes}"
          </p>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;
