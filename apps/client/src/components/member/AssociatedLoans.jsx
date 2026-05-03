import { DollarSign, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import InfiniteLoader from '@/components/InfiniteLoader';

const AssociatedLoans = ({
  loans,
  isMobile,
  hasMoreLoans,
  loanObserverTarget,
  isFetchingMoreLoans,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black tracking-tighter">
            Associated Loans
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Active debt obligations for this member.
          </p>
        </div>
        <div className="p-3 bg-muted/30 rounded-2xl">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        {loans.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
              Zero Active Loans
            </p>
          </div>
        ) : (
          loans.map((loan) => (
            <div
              key={loan._id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group gap-4 sm:gap-0"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <DollarSign size={22} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight">
                    {formatCurrency(loan.principal)}
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {loan.duration} Months •{' '}
                    <span
                      className={`px-1.5 py-0.5 rounded-md ${
                        loan.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : loan.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600'
                            : loan.status === 'completed'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {loan.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-border/10">
                <div className="text-left sm:text-right">
                  <div className="text-base font-black text-rose-500">
                    {formatCurrency(loan.remainingAmount)}
                  </div>
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    Remaining
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/loans/${loan._id}`)}
                  className="p-3 bg-primary/20 text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Infinite Scroll Trigger for Loans */}
        {isMobile && hasMoreLoans && (
          <div ref={loanObserverTarget}>
            <InfiniteLoader isFetchingMore={isFetchingMoreLoans} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AssociatedLoans;
