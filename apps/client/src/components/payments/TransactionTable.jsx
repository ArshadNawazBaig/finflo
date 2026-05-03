import { formatCurrency, capitalize } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, ChevronsUpDown, Hash, User, RotateCcw, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Pagination from '../ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';
import { generateTransactionReceipt } from '@/lib/pdfExportUtils';
import { toast } from 'sonner';

const NON_REVERSIBLE = ['loan_disbursement', 'profit_distribution'];

const handleDownloadReceipt = async (transaction) => {
  try {
    const isIncome = transaction.type === 'income' || (transaction.type === 'transfer' && transaction.category?.includes('deposit') || transaction.category === 'investment');
    const member = transaction.member || transaction.customer || {};
    const category = transaction.category || '';

    // Map category to receipt type
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

const TransactionTable = ({
  data,
  pagination,
  sortBy,
  sortOrder,
  onSort,
  hideType = false,
  onReverse,
}) => {
  const renderSortIcon = (column) => {
    if (sortBy !== column)
      return <ChevronsUpDown size={14} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className="text-primary" />
    ) : (
      <ArrowDown size={14} className="text-primary" />
    );
  };
  return (
    <div className="w-full bg-card/10 backdrop-blur-sm border border-border/40 rounded-[2rem] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-left bg-muted/30">
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {renderSortIcon('date')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Related To
              </th>
              {!hideType && (
                <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                  Type
                </th>
              )}
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Category
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Amount
                  {renderSortIcon('amount')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Status
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Notes
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((transaction) => {
              const isReversed = transaction.status === 'Reversed';
              const isReversal = !!transaction.originalTransaction;
              const canReverse =
                onReverse &&
                !isReversed &&
                !isReversal &&
                transaction.status === 'Completed' &&
                !NON_REVERSIBLE.includes(transaction.category);

              return (
                <tr
                  key={transaction._id}
                  className={cn(
                    'group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors',
                    isReversed && 'opacity-50',
                  )}
                >
                  <td className="py-4 px-4 text-muted-foreground font-medium">
                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm capitalize',
                          transaction.customer
                            ? 'bg-primary/10 text-primary'
                            : transaction.category === 'salary'
                              ? 'bg-orange-500/10 text-orange-600'
                              : 'bg-blue-500/10 text-blue-500',
                        )}
                      >
                        {(
                          transaction.customer?.name ||
                          transaction.member?.name ||
                          (transaction.category === 'salary' && 'B') ||
                          'U'
                        ).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-semibold text-sm text-nowrap truncate max-w-[150px]">
                          {capitalize(
                            transaction.customer?.name ||
                              transaction.member?.name ||
                              (transaction.category === 'salary' &&
                                'Branch Operations') ||
                              'System',
                          )}
                        </div>
                        {transaction.branchId?.name && (
                          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1">
                            {transaction.branchId.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {!hideType && (
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          transaction.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : transaction.type === 'transfer'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-rose-500/10 text-rose-600',
                        )}
                      >
                        {transaction.type}
                      </span>
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-xs font-medium capitalize">
                        {isReversal && (
                          <span className="text-amber-600 mr-1">[REV]</span>
                        )}
                        {transaction.category.replace('_', ' ')}
                      </span>
                      {transaction.description && (
                        <span className="text-[10px] text-muted-foreground/60 font-medium truncate max-w-[180px] block">
                          {transaction.description}
                        </span>
                      )}
                      {transaction.category === 'salary' &&
                        transaction.referenceId && (
                          <Link
                            to={`/team/${transaction.referenceId._id || transaction.referenceId}`}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-black uppercase tracking-tight text-primary hover:bg-primary/20 transition-all w-fit"
                          >
                            <User size={10} />
                            {transaction.referenceId.name}
                          </Link>
                        )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div
                      className={cn(
                        'font-bold tabular-nums',
                        isReversed
                          ? 'text-muted-foreground line-through'
                          : transaction.type === 'income'
                            ? 'text-emerald-600'
                            : transaction.type === 'transfer'
                              ? 'text-blue-600'
                              : 'text-rose-600',
                      )}
                    >
                      {transaction.type === 'income' || (transaction.type === 'transfer' && (transaction.category?.includes('deposit') || transaction.category === 'investment' || transaction.category === 'saving_deposit')) ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border w-fit leading-none',
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
                          'w-1.5 h-1.5 rounded-full',
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
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground truncate max-w-[200px]">
                    {transaction.notes || '-'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip content="Download Receipt">
                        <button
                          onClick={() => handleDownloadReceipt(transaction)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      </Tooltip>
                      {canReverse && (
                        <Tooltip content="Reverse">
                          <button
                            onClick={() => onReverse(transaction)}
                            className="p-1.5 rounded-lg hover:bg-orange-500/10 text-muted-foreground hover:text-orange-600 transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </Tooltip>
                      )}
                      {isReversed && (
                        <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">
                          Reversed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <EmptyState
          icon={Hash}
          title="No Transactions"
          description="No financial transactions have been recorded yet."
          className="border-none bg-transparent py-12"
        />
      )}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalEntries={pagination.totalEntries}
          limit={pagination.limit}
          onPageChange={pagination.onPageChange}
          onLimitChange={pagination.onLimitChange}
        />
      )}
    </div>
  );
};

export default TransactionTable;
