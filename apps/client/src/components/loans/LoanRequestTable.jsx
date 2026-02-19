import {
  Check,
  X,
  Loader2,
  Calendar,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  FileQuestion,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { formatPKR, capitalize } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import Pagination from '../ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

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
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Grantor Status
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                AI Risk
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
                  <Link
                    to={
                      request.customer?._id
                        ? `/customers/${request.customer._id}`
                        : '#'
                    }
                    className="flex items-center gap-3 group/link hover:opacity-80 transition-opacity"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm capitalize group-hover/link:bg-primary/20 transition-colors">
                      {request.customer?.name
                        ? request.customer.name.charAt(0).toUpperCase()
                        : '?'}
                    </div>
                    <div className="font-semibold text-sm group-hover/link:text-primary transition-colors">
                      {request.customer?.name
                        ? capitalize(request.customer.name)
                        : 'Unknown'}
                    </div>
                  </Link>
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
                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                    {request.notes || '—'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      request.grantorStatus === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : request.grantorStatus === 'rejected'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {request.grantorStatus || 'pending'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  {request.riskDetails ? (
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-black border ${
                          ['A+', 'A'].includes(request.riskDetails.grade)
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : ['B', 'C'].includes(request.riskDetails.grade)
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}
                      >
                        {request.riskDetails.grade}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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
        <EmptyState
          icon={FileQuestion}
          title="No Requests"
          description="There are no pending loan requests at the moment."
          className="border-none bg-transparent py-12"
        />
      )}

      {pagination && <Pagination {...pagination} />}
    </div>
  );
};

export default LoanRequestTable;
