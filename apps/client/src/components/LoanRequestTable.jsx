import {
  Check,
  X,
  Loader2,
  Calendar,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatPKR, capitalize } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import Pagination from './ui/Pagination';

const LoanRequestTable = ({
  requests,
  pagination,
  onApprove,
  onReject,
  processingId,
  sortBy,
  sortOrder,
  onSort,
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
    <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-left bg-muted/30">
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('customer.name')}
              >
                <div className="flex items-center gap-1">
                  Member Name
                  {renderSortIcon('customer.name')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('principal')}
              >
                <div className="flex items-center gap-1">
                  Amount
                  {renderSortIcon('principal')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('duration')}
              >
                <div className="flex items-center gap-1">
                  Duration
                  {renderSortIcon('duration')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('createdAt')}
              >
                <div className="flex items-center gap-1">
                  Requested
                  {renderSortIcon('createdAt')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Status
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Notes
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request._id}
                className="group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {request.customer?.name
                        ? request.customer.name.charAt(0).toUpperCase()
                        : '?'}
                    </div>
                    <div className="font-semibold text-sm">
                      {request.customer?.name
                        ? capitalize(request.customer.name)
                        : 'Unknown'}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-bold text-sm text-primary">
                    {formatPKR(request.principal)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-muted-foreground">
                    {request.duration} Mo
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar size={14} />
                    {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      request.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : request.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600'
                          : request.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-red-500/10 text-red-600'
                    }`}
                  >
                    {request.status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-xs text-muted-foreground italic max-w-xs truncate">
                    {request.notes || '—'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-end gap-2">
                    {request.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 rounded-lg hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/50 transition-all"
                          onClick={() => onReject(request._id)}
                          disabled={processingId === request._id}
                        >
                          {processingId === request._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <X size={14} className="mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm shadow-emerald-500/20"
                          onClick={() => onApprove(request)}
                          disabled={processingId === request._id}
                        >
                          <Check size={14} className="mr-1" />
                          Approve
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {requests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No requests found
        </div>
      )}

      {pagination && <Pagination {...pagination} />}
    </div>
  );
};

export default LoanRequestTable;
