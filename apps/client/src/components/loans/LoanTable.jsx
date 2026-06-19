/* eslint-disable react/prop-types -- project convention: no propTypes */
import { formatCurrency, capitalize } from '@/lib/utils';
import {
  Edit,
  Trash2,
  Info,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Banknote,
  MessageSquare,
  Mail,
  CreditCard,
  Download,
  RotateCw,
} from 'lucide-react';
import Pagination from '../ui/Pagination';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';
import Tooltip from '@/components/ui/Tooltip';
import ApprovalActions from '@/components/loans/ApprovalActions';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import MemberAvatar from '@/components/member/MemberAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';

const LoanTable = ({
  data,
  pagination,
  onRepay,
  onEdit,
  onDelete,
  onRenew,
  sortBy,
  sortOrder,
  onSort,
  onRefresh,
}) => {
  // A loan is near/after maturity once startDate + duration months has (nearly)
  // arrived — used to emphasise the Renew action.
  const isNearMaturity = (loan) => {
    if (!loan?.startDate || !loan?.duration) return false;
    const maturity = new Date(loan.startDate);
    maturity.setMonth(maturity.getMonth() + Number(loan.duration));
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    return maturity.getTime() - Date.now() <= THIRTY_DAYS;
  };
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
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[20%] text-nowrap">
                Borrower
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground w-[15%] text-right text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('principal')}
              >
                <div className="flex items-center justify-end gap-1">
                  Amount
                  {renderSortIcon('principal')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground w-[15%] text-center text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('duration')}
              >
                <div className="flex items-center justify-center gap-1">
                  Term
                  {renderSortIcon('duration')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground w-[15%] text-center text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('startDate')}
              >
                <div className="flex items-center justify-center gap-1">
                  Date
                  {renderSortIcon('startDate')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[15%] text-center text-nowrap">
                Progress
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground w-[10%] text-center text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center justify-center gap-1">
                  Status
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[10%] text-right text-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((loan) => {
              const progress = Math.min(
                Math.round((loan.paidAmount / loan.totalAmount) * 100),
                100,
              );
              return (
                <tr
                  key={loan._id}
                  className="group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        name={loan.customer?.name || 'U'}
                        profilePicture={loan.customer?.profilePicture}
                        size={36}
                        rounded="rounded-full"
                        className="text-sm capitalize"
                      />
                      <Link
                        to={`/customers/${loan.customer?._id}`}
                        className="block hover:opacity-70 transition-opacity"
                      >
                        <div className="font-semibold text-sm">
                          {capitalize(loan.customer?.name || 'Unknown')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {loan._id.slice(-6).toUpperCase()}
                        </div>
                      </Link>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="font-bold">{formatCurrency(loan.principal)}</div>
                    <div className="text-xs text-muted-foreground">
                      +{formatCurrency(loan.totalAmount - loan.principal)} Interest
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-2 py-1 rounded bg-muted text-xs font-semibold">
                      {loan.duration || 'N/A'} Mo
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-muted-foreground">
                    {new Date(
                      loan.startDate || loan.createdAt,
                    ).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="w-full max-w-[100px] mx-auto space-y-1.5">
                      <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <StatusBadge status={loan.status} className="text-xs font-bold" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {loan.status === 'pending' && (
                        <div className="mr-2 pr-2 border-r border-border/50">
                          <ApprovalActions
                            loan={loan}
                            onSuccess={() => {
                              if (onRefresh) onRefresh();
                              if (pagination && pagination.onPageChange) {
                                pagination.onPageChange(pagination.currentPage);
                              }
                            }}
                          />
                        </div>
                      )}
                      {loan.status !== 'completed' &&
                        loan.status !== 'rejected' && (
                          <>
                            <Tooltip content="Repay Loan" position="top">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  if (loan.status === 'active') {
                                    onRepay(loan);
                                  }
                                }}
                                className={`p-1.5 rounded-md transition-colors ${
                                  loan.status === 'active'
                                    ? 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                                    : 'opacity-50 cursor-not-allowed text-muted-foreground'
                                }`}
                                disabled={loan.status !== 'active'}
                              >
                                <Banknote size={16} />
                              </Button>
                            </Tooltip>
                            <Tooltip content="WhatsApp Reminder" position="top">
                              <a
                                href={generateWhatsAppLink(
                                  loan.customer?.phone || '',
                                  loan.customer?.name || '',
                                  loan.emi,
                                  new Date(),
                                  false,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <MessageSquare size={16} />
                              </a>
                            </Tooltip>
                            <Tooltip content="Email Reminder" position="top">
                              <a
                                href={generateEmailLink(
                                  loan.customer?.email || '',
                                  loan.customer?.name || '',
                                  loan.emi,
                                  new Date(),
                                  false,
                                )}
                                className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Mail size={16} />
                              </a>
                            </Tooltip>
                            <Tooltip
                              content="Download Statement"
                              position="top"
                            >
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  exportLoanStatement(
                                    loan,
                                    loan.repayments || [],
                                  )
                                }
                                className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors"
                              >
                                <Download size={16} />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Edit Loan" position="top">
                              <Button
                                variant="ghost"
                                onClick={() => onEdit(loan)}
                                className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors"
                              >
                                <Edit size={16} />
                              </Button>
                            </Tooltip>
                          </>
                        )}
                      {['active', 'overdue', 'completed'].includes(
                        loan.status,
                      ) &&
                        onRenew && (
                          <Tooltip
                            content={
                              isNearMaturity(loan)
                                ? 'Renew Loan (due/matured)'
                                : 'Renew Loan'
                            }
                            position="top"
                          >
                            <Button
                              variant="ghost"
                              onClick={() => onRenew(loan)}
                              className={`p-1.5 rounded-md transition-colors ${
                                isNearMaturity(loan)
                                  ? 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20'
                                  : 'hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-600'
                              }`}
                            >
                              <RotateCw size={16} />
                            </Button>
                          </Tooltip>
                        )}
                      <Tooltip content="View Details" position="top">
                        <Link
                          to={`/loans/${loan._id}`}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Info size={16} />
                        </Link>
                      </Tooltip>
                      <Tooltip content="Delete" position="top">
                        <Button
                          variant="ghost"
                          onClick={() => onDelete(loan)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Tooltip>
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
          icon={CreditCard}
          title="No Loans Found"
          description="There are no loan records to display at this time."
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

export default LoanTable;
