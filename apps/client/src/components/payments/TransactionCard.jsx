import { formatCurrency, capitalize } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import { format } from 'date-fns';
import { Receipt, User, TrendingUp, ArrowDown, RotateCcw, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/button';
import { generateTransactionReceipt } from '@/lib/pdfExportUtils';
import { toast } from 'sonner';

const NON_REVERSIBLE = ['loan_disbursement', 'profit_distribution'];

const handleDownloadReceipt = async (transaction) => {
  try {
    const isIncome = transaction.type === 'income' || transaction.type === 'credit';
    const member = transaction.member || transaction.customer || {};
    const category = transaction.category || '';

    let type = 'deposit';
    if (category.includes('withdrawal')) type = 'withdrawal';
    else if (category.includes('repayment')) type = 'repayment';
    else if (category.includes('checkbook')) type = 'checkbook_fee';
    else if (category.includes('transfer')) type = isIncome ? 'transfer_receive' : 'transfer_send';
    else if (category.includes('salary') || category.includes('late_fee')) type = 'late_fee';
    else if (category.includes('profit') || category.includes('distribution')) type = 'profit';
    else if (category.includes('share')) type = isIncome ? 'share_deposit' : 'share_withdrawal';
    else if (!isIncome) type = 'withdrawal';

    await generateTransactionReceipt({
      member,
      type,
      amount: transaction.amount,
      description: transaction.description || transaction.notes || '',
      date: transaction.date,
      referenceId: transaction._id,
      accountType: transaction.accountType || 'current',
      extra: {
        ...(transaction.paymentMethod && { 'Payment Method': capitalize(transaction.paymentMethod) }),
        ...(transaction.branchId?.name && { Branch: transaction.branchId.name }),
        ...(transaction.status && { Status: transaction.status }),
      },
    });
  } catch (error) {
    console.error('Receipt download error:', error);
    toast.error('Failed to download receipt');
  }
};

const TransactionCard = ({ transaction, hideType = false, onReverse }) => {
  const isIncome = isCreditType(transaction.type, 'ledger');
  const isTransfer = transaction.type === 'credit' || transaction.type === 'debit';
  const isReversed = transaction.status === 'Reversed';
  const isReversal = !!transaction.originalTransaction;
  const canReverse =
    onReverse &&
    !isReversed &&
    !isReversal &&
    transaction.status === 'Completed' &&
    !NON_REVERSIBLE.includes(transaction.category);

  return (
    <div
      className={cn(
        'bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-3 py-4 shadow-sm hover:shadow-md transition-all duration-300',
        isReversed && 'opacity-50',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className={cn(
              'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center',
              isTransfer
                ? 'bg-blue-500/10 text-blue-600'
                : isIncome
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-rose-500/10 text-rose-600',
            )}
          >
            {isIncome ? <TrendingUp size={20} /> : <ArrowDown size={20} />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-foreground capitalize">
              {isReversal && <span className="text-amber-600 mr-1">[REV]</span>}
              {transaction.category.replace(/_/g, ' ')}
            </span>
            {transaction.category === 'salary' && transaction.referenceId && (
              <Link
                to={`/team/${transaction.referenceId._id || transaction.referenceId}`}
                className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-[8px] font-black uppercase tracking-tight text-primary hover:bg-primary/20 transition-all w-fit"
              >
                <User size={8} />
                {capitalize(transaction.referenceId.name)}
              </Link>
            )}
            {transaction.description && (
              <span className="text-[10px] text-muted-foreground/70 font-medium truncate max-w-[200px] block">
                {transaction.description}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-medium">
              {format(new Date(transaction.date), 'MMM d, yyyy • hh:mm a')}
            </span>
          </div>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t border-border/10 sm:border-0 mt-1 sm:mt-0 gap-2">
          <div
            className={cn(
              'font-black text-base tabular-nums',
              isReversed
                ? 'text-muted-foreground line-through'
                : isTransfer
                  ? 'text-blue-600'
                  : isIncome
                    ? 'text-emerald-600'
                    : 'text-rose-600',
            )}
          >
            {isIncome ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </div>
          <div className="flex items-center gap-2">
            {!hideType && (
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                {transaction.type}
              </span>
            )}
            <div
              className={cn(
                'px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest flex items-center gap-1 border leading-none',
                (transaction.status || 'Completed') === 'Completed' &&
                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                transaction.status === 'Pending' &&
                  'bg-amber-500/10 text-amber-600 border-amber-500/20',
                transaction.status === 'Failed' &&
                  'bg-rose-500/10 text-rose-600 border-rose-500/20',
                transaction.status === 'Reversed' &&
                  'bg-orange-500/10 text-orange-600 border-orange-500/20',
              )}
            >
              <span
                className={cn(
                  'w-1 h-1 rounded-full',
                  (transaction.status || 'Completed') === 'Completed' &&
                    'bg-emerald-500',
                  transaction.status === 'Pending' &&
                    'bg-amber-500 animate-pulse',
                  transaction.status === 'Failed' && 'bg-rose-500',
                  transaction.status === 'Reversed' && 'bg-orange-500',
                )}
              />
              {transaction.status || 'Completed'}
            </div>
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

      {transaction.notes && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-[11px] text-muted-foreground/80 font-medium ">
            "{transaction.notes}"
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2">
        <Tooltip content="Download Receipt">
          <Button
            variant="ghost"
            onClick={() => handleDownloadReceipt(transaction)}
            className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          >
            <Download size={15} />
          </Button>
        </Tooltip>
        {canReverse && (
          <Tooltip content="Reverse">
            <Button
              variant="ghost"
              onClick={() => onReverse(transaction)}
              className="p-2 rounded-xl hover:bg-orange-500/10 text-muted-foreground hover:text-orange-600 transition-colors"
            >
              <RotateCcw size={15} />
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default TransactionCard;
