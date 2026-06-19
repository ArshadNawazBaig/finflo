import { BookOpen, Loader2, Hash, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

const CheckbookSection = ({
  checkbookTotal,
  isCheckbooksLoading,
  checkbooks,
  handleUpdateCheckbookStatus,
  isCancellingCheckbook,
  handleCancelCheckbook,
  checkbookTotalPages,
  checkbookPage,
  fetchCheckbooks,
}) => {
  return (
    <div className="bg-card/10 backdrop-blur-sm p-6 sm:p-10 rounded-[2rem] border border-border/40 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tighter text-primary">
            Checkbook Registry
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Track all checkbooks issued to this member.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            {checkbookTotal} Total
          </span>
          <div className="p-3 rounded-2xl bg-indigo-500/10">
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
      </div>

      {isCheckbooksLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : checkbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Checkbooks Issued"
          description="Issue a checkbook using the action button above."
        />
      ) : (
        <>
          <div className="space-y-3">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-3 border-b border-border/50 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              <div className="col-span-3 flex items-center gap-1">
                <Hash size={10} /> Checkbook #
              </div>
              <div className="col-span-2">Leaves</div>
              <div className="col-span-2">Fee</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            <div className="space-y-3 md:space-y-0 md:divide-y md:divide-border/30">
              {checkbooks.map((cb) => (
                <div
                  key={cb._id}
                  className="group flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 p-4 md:py-3 md:px-4 rounded-2xl md:rounded-none bg-muted/5 md:bg-transparent border border-border/30 md:border-transparent hover:bg-muted/10 transition-colors"
                >
                  {/* Mobile Header: Checkbook # & Status */}
                  <div className="flex md:hidden items-center justify-between border-b border-border/10 pb-3 mb-1">
                    <span className="text-xs font-black font-mono text-indigo-600">
                      {cb.checkbookNumber}
                    </span>
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                        cb.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : cb.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
                      )}
                    >
                      {cb.status}
                      {cb.refunded && ' (Refund)'}
                    </span>
                  </div>

                  {/* Desktop Checkbook # */}
                  <div className="hidden md:flex items-center col-span-3">
                    <span className="text-xs font-black font-mono text-indigo-600">
                      {cb.checkbookNumber}
                    </span>
                  </div>

                  {/* Leaves */}
                  <div className="flex items-center justify-between md:justify-start col-span-2">
                    <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Leaves
                    </span>
                    <span className="text-xs font-bold">
                      {cb.numberOfLeaves}/<span className="text-muted-foreground">{cb.usedLeaves || 0}</span>
                    </span>
                  </div>

                  {/* Fee */}
                  <div className="flex items-center justify-between md:justify-start col-span-2">
                    <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Fee
                    </span>
                    <span className="text-xs font-black text-primary">
                      {formatCurrency(cb.fee)}
                    </span>
                  </div>

                  {/* Desktop Status */}
                  <div className="hidden md:flex items-center col-span-2">
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                        cb.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : cb.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
                      )}
                    >
                      {cb.status}
                      {cb.refunded && ' (Refund)'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between md:justify-start col-span-2">
                    <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Date
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {new Date(cb.createdAt).toLocaleDateString(
                        'en-GB',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end col-span-1 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-border/10 md:border-none">
                    {cb.status === 'active' ? (
                      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Tooltip content="Mark as Used">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              handleUpdateCheckbookStatus(cb._id, 'used')
                            }
                            disabled={isCancellingCheckbook === cb._id}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 transition-colors disabled:opacity-50"
                          >
                            {isCancellingCheckbook === cb._id ? (
                              <Loader2
                                size={12}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                          </Button>
                        </Tooltip>
                        <Tooltip content="Cancel & Refund">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              handleCancelCheckbook(cb._id, true)
                            }
                            disabled={isCancellingCheckbook === cb._id}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 transition-colors disabled:opacity-50"
                          >
                            {isCancellingCheckbook === cb._id ? (
                              <Loader2
                                size={12}
                                className="animate-spin"
                              />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                          </Button>
                        </Tooltip>
                        <Tooltip content="Cancel (No Refund)">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              handleCancelCheckbook(cb._id, false)
                            }
                            disabled={isCancellingCheckbook === cb._id}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={12} />
                          </Button>
                        </Tooltip>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Tooltip content="Reactivate">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              handleUpdateCheckbookStatus(cb._id, 'active')
                            }
                            disabled={isCancellingCheckbook === cb._id}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {isCancellingCheckbook === cb._id ? (
                              <Loader2
                                size={12}
                                className="animate-spin"
                              />
                            ) : (
                              <RefreshCw size={12} />
                            )}
                          </Button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {checkbookTotalPages > 1 && (
            <div className="mt-6 border-t border-border/50 pt-6">
              <Pagination
                currentPage={checkbookPage}
                totalPages={checkbookTotalPages}
                totalEntries={checkbookTotal}
                limit={5}
                onPageChange={(p) => fetchCheckbooks(p)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CheckbookSection;
