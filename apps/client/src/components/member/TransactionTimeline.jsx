import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import InfiniteLoader from '@/components/InfiniteLoader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { generateTransactionReceipt } from '@/lib/pdfExportUtils';

const TransactionTimeline = ({
  investments,
  isInvestmentsLoading,
  isMobile,
  hasMoreInvestments,
  investmentObserverTarget,
  isFetchingMoreInvestments,
  investmentPage,
  investmentTotalPages,
  investmentTotal,
  itemsPerPage,
  handleInvestmentPageChange,
  member,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tighter">
            Transaction Registry
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            History of all fund injections and withdrawals.
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-muted/30">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        {isInvestmentsLoading ? (
          <div className="py-20 flex justify-center items-center">
            <InfiniteLoader isFetchingMore={true} />
          </div>
        ) : investments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No Transactions"
            description="Zero recorded transactions for this member yet."
            className="py-12 border-none bg-transparent"
          />
        ) : (
          investments.map((inv) => {
            // Inflow vs outflow from the MEMBER's perspective. Loan
            // disbursements and profit credits raise the wallet balance, so
            // they render with a + sign — see lib/transactionDirection.
            const isCredit = isCreditType(inv.type);
            return (
            <div
              key={inv._id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group gap-4 sm:gap-0"
            >
              <div className="flex items-center gap-5">
                <div
                  className={`min-w-12 min-h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isCredit
                      ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                      : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'
                  }`}
                >
                  {isCredit ? (
                    <ArrowUpCircle size={22} />
                  ) : (
                    <ArrowDownCircle size={22} />
                  )}
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight capitalize">
                    {inv.description || inv.type}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap md:flex-nowrap">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(inv.date).toLocaleDateString()}
                    </div>
                    {inv.status && (
                      <div
                        className={cn(
                          'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border leading-none',
                          inv.status === 'Completed' &&
                            'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                          inv.status === 'Pending' &&
                            'bg-amber-500/10 text-amber-600 border-amber-500/20',
                          inv.status === 'Failed' &&
                            'bg-rose-500/10 text-rose-600 border-rose-500/20',
                        )}
                      >
                        <span
                          className={cn(
                            'w-1 h-1 rounded-full',
                            inv.status === 'Completed' && 'bg-emerald-500',
                            inv.status === 'Pending' && 'bg-amber-500 animate-pulse',
                            inv.status === 'Failed' && 'bg-rose-500',
                          )}
                        />
                        {inv.status}
                      </div>
                    )}

                    {/* Sender/Recipient Details */}
                    {(inv.type === 'transfer_receive' ||
                      inv.type === 'transfer_send') && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                        <div className="text-[10px] font-bold text-muted-foreground tracking-tight flex items-center gap-1">
                          {inv.type === 'transfer_receive' ? (
                            <>
                              <ArrowDownLeft size={10} className="text-emerald-500" />
                              From:{' '}
                              <span className="text-foreground capitalize">
                                {inv.metadata?.senderName ||
                                  inv.description?.replace(/transfer from /i, '')}
                              </span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={10} className="text-rose-500" />
                              To:{' '}
                              <span className="text-foreground">
                                {inv.metadata?.recipientName ||
                                  inv.description?.replace(/transfer to /i, '')}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/10">
                <Tooltip content="Download Receipt">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      generateTransactionReceipt({
                        member,
                        type: inv.type,
                        amount: inv.amount,
                        description: inv.description,
                        date: inv.date,
                        balanceAfter: inv.balanceAfter,
                        referenceId: inv._id,
                        accountType: inv.accountType || 'current',
                      })
                    }
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <FileText size={14} />
                  </Button>
                </Tooltip>
                <div>
                  <div
                    className={`text-lg font-black ${
                      isCredit ? 'text-emerald-600' : 'text-indigo-600'
                    }`}
                  >
                    {isCredit ? '+' : '-'} {formatCurrency(inv.amount)}
                  </div>
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    Balance: {formatCurrency(inv.balanceAfter)}
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}

        {/* Infinite Scroll Trigger for Investments (Mobile only) */}
        {isMobile && hasMoreInvestments && (
          <div ref={investmentObserverTarget}>
            <InfiniteLoader isFetchingMore={isFetchingMoreInvestments} />
          </div>
        )}

        {/* Desktop Pagination */}
        {!isMobile && investments.length > 0 && (
          <div className="mt-6 border-t border-border/50 pt-6">
            <Pagination
              currentPage={investmentPage}
              totalPages={investmentTotalPages}
              totalEntries={investmentTotal}
              limit={itemsPerPage}
              onPageChange={handleInvestmentPageChange}
              onLimitChange={() => {}} // Stability: keeping it locked to 5 for now as requested
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionTimeline;
