import { formatPKR, capitalize } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, ChevronsUpDown, Hash } from 'lucide-react';
import Pagination from './ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const TransactionTable = ({ data, pagination, sortBy, sortOrder, onSort }) => {
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
    <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
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
                Customer
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap">
                Loan Amount
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Payment
                  {renderSortIcon('amount')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((transaction) => (
              <tr
                key={transaction._id}
                className="group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors"
              >
                <td className="py-4 px-4 text-muted-foreground font-medium">
                  {format(new Date(transaction.date), 'MMM d, yyyy')}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm capitalize">
                      {transaction.customer?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="font-semibold text-sm">
                      {capitalize(transaction.customer?.name || 'Unknown')}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right text-muted-foreground font-medium tabular-nums">
                  {formatPKR(transaction.loan?.principal || 0)}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="font-bold text-emerald-600 tabular-nums">
                    {formatPKR(transaction.amount)}
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground truncate max-w-[200px]">
                  {transaction.notes || '-'}
                </td>
              </tr>
            ))}
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
