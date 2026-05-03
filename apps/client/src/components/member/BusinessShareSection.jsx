import { Building2, ArrowUpCircle, ArrowDownCircle, BadgeDollarSign, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import Pagination from '@/components/ui/Pagination';
import { cn, formatCurrency } from '@/lib/utils';

const BusinessShareSection = ({
  member,
  shareFormType,
  setShareFormType,
  showShareForm,
  setShowShareForm,
  handleShareSubmit,
  shareAmount,
  setShareAmount,
  useShareCustomRates,
  setUseShareCustomRates,
  sharePeriod,
  setSharePeriod,
  deductFromBalance,
  setDeductFromBalance,
  isSubmittingShare,
  isSharesLoading,
  shares,
  isMobile,
  shareCurrentPage,
  shareTotalPages,
  shareObserverTarget,
  isFetchingMoreShares,
  shareTotal,
  shareLimit,
  fetchMemberShares,
  setShareLimit,
  setShareCurrentPage,
  shareDescription,
  setShareDescription,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-violet-500/20 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <Building2 size={20} className="text-violet-500" />
            Business Share
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Member&apos;s share of the business — separate from main balance,
            not auto-deducted in loans.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShareFormType('deposit');
              setShowShareForm(true);
            }}
            className="px-4 py-2 rounded-xl bg-violet-500/10 text-violet-600 hover:bg-violet-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <ArrowUpCircle size={14} /> Add Share
          </button>
          <button
            onClick={() => {
              setShareFormType('withdrawal');
              setShowShareForm(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <ArrowDownCircle size={14} /> Withdraw
          </button>
        </div>
      </div>

      {/* Share Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-violet-500/5 border border-violet-500/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Share Balance
          </p>
          <p className="text-2xl font-black tracking-tight mt-1 text-violet-600">
            {formatCurrency(member.shareBalance || 0)}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Total Share Invested
          </p>
          <p className="text-2xl font-black tracking-tight mt-1">
            {formatCurrency(member.totalShareInvested || 0)}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Share Profit Earned
          </p>
          <p className="text-2xl font-black tracking-tight mt-1 text-amber-600">
            {formatCurrency(member.totalShareProfit || 0)}
          </p>
        </div>
      </div>

      {/* Share Form Modal */}
      {showShareForm && (
        <div className="p-6 rounded-2xl border-2 border-violet-500/20 bg-violet-500/5 animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              {shareFormType === 'deposit' ? (
                <ArrowUpCircle size={16} className="text-violet-500" />
              ) : shareFormType === 'withdrawal' ? (
                <ArrowDownCircle size={16} className="text-rose-500" />
              ) : (
                <BadgeDollarSign size={16} className="text-amber-500" />
              )}
              {shareFormType === 'deposit'
                ? 'Add Share Investment'
                : shareFormType === 'withdrawal'
                  ? 'Withdraw from Share'
                  : 'Distribute Share Profit (All Members)'}
            </h4>
            <button
              onClick={() => setShowShareForm(false)}
              className="p-1.5 hover:bg-muted rounded-full"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleShareSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {shareFormType === 'profit'
                    ? useShareCustomRates
                      ? 'Total Profit Reference'
                      : 'Total Profit Pool'
                    : 'Amount'}
                </label>
                <input
                  type="number"
                  required={!useShareCustomRates || shareFormType !== 'profit'}
                  min="1"
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                  placeholder={
                    useShareCustomRates && shareFormType === 'profit'
                      ? 'Optional reference amount'
                      : 'Enter amount'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
              {shareFormType === 'profit' && (
                <div className="md:col-span-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                      Distribution Method
                    </label>
                    <div className="flex bg-muted p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setUseShareCustomRates(false)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${!useShareCustomRates ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                      >
                        Proportional
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseShareCustomRates(true)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${useShareCustomRates ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                      >
                        Custom Rates
                      </button>
                    </div>
                  </div>
                  {useShareCustomRates ? (
                    <p className="text-[10px] font-medium text-amber-600 italic">
                      Profit will be calculated for each member using
                      their individual Share Profit Rate setting.
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-amber-600 italic">
                      Profit pool will be split among all members based on
                      their share balance size.
                    </p>
                  )}
                </div>
              )}
              {shareFormType === 'profit' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Period (e.g. Feb 2026)
                  </label>
                  <input
                    type="text"
                    value={sharePeriod}
                    onChange={(e) => setSharePeriod(e.target.value)}
                    placeholder="Feb 2026"
                    className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
              )}

              {shareFormType === 'deposit' && (
                <div className="md:col-span-2 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                        Funding Source
                      </label>
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Deduct from current main balance?
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeductFromBalance(!deductFromBalance)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${deductFromBalance ? 'bg-violet-600' : 'bg-muted'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${deductFromBalance ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                  {deductFromBalance && (
                    <div className="pt-2 border-t border-violet-500/10 flex justify-between items-center text-[10px]">
                      <span className="font-bold text-muted-foreground uppercase">
                        Available Balance:
                      </span>
                      <span
                        className={`font-black tracking-widest ${member.currentBalance < (parseFloat(shareAmount) || 0) ? 'text-rose-500' : 'text-violet-600'}`}
                      >
                        {formatCurrency(member.currentBalance)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowShareForm(false)}
                className="px-6 py-2.5 rounded-xl border border-border/50 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={isSubmittingShare}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 ${
                  shareFormType === 'deposit'
                    ? 'bg-violet-600 hover:bg-violet-700'
                    : shareFormType === 'withdrawal'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Confirm
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Share History */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Share Transaction History
        </p>
        {isSharesLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="animate-spin text-violet-500" />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-violet-500/20 rounded-2xl bg-violet-500/5">
            <Building2 size={28} className="mx-auto text-violet-300 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              No share transactions yet
            </p>
          </div>
        ) : (
          <>
            {shares.map((s) => {
              const isCredit =
                s.type === 'share_deposit' || s.type === 'share_profit';
              const color =
                s.type === 'share_profit'
                  ? 'text-amber-600'
                  : isCredit
                    ? 'text-violet-600'
                    : 'text-rose-600';
              const label =
                s.type === 'share_deposit'
                  ? 'Share Deposit'
                  : s.type === 'share_withdrawal'
                    ? 'Withdrawal'
                    : 'Share Profit';
              return (
                <div
                  key={s._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${isCredit ? 'bg-violet-500/10' : 'bg-rose-500/10'} ${color}`}
                    >
                      {isCredit ? (
                        <ArrowUpCircle size={18} />
                      ) : (
                        <ArrowDownCircle size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">
                        {s.description || label}
                      </p>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-[10px] font-black uppercase tracking-widest ${color}`}
                        >
                          {label}
                          {s.period ? ` · ${s.period}` : ''}
                        </p>
                        {s.status && (
                          <div
                            className={cn(
                              'text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border leading-none',
                              s.status === 'Completed' &&
                                'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                              s.status === 'Pending' &&
                                'bg-amber-500/10 text-amber-600 border-amber-500/20',
                              s.status === 'Failed' &&
                                'bg-rose-500/10 text-rose-600 border-rose-500/20',
                            )}
                          >
                            <span
                              className={cn(
                                'w-0.5 h-0.5 rounded-full',
                                s.status === 'Completed' && 'bg-emerald-500',
                                s.status === 'Pending' &&
                                  'bg-amber-500 animate-pulse',
                                s.status === 'Failed' && 'bg-rose-500',
                              )}
                            />
                            {s.status}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-border/5 sm:border-0 mt-2 sm:mt-0 w-full sm:w-auto shrink-0">
                    <div className="text-left sm:text-right">
                      <p className={`text-base font-black ${color}`}>
                        {isCredit ? '+' : '-'}
                        {formatCurrency(s.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {isMobile && shareCurrentPage < shareTotalPages && (
              <div ref={shareObserverTarget} className="py-4 px-4">
                <InfiniteLoader isFetchingMore={isFetchingMoreShares} />
              </div>
            )}

            {!isMobile && shares.length > 0 && (
              <div className="mt-6 border-t border-border/50 pt-6">
                <Pagination
                  currentPage={shareCurrentPage}
                  totalPages={shareTotalPages}
                  totalEntries={shareTotal}
                  limit={shareLimit}
                  onPageChange={(p) => fetchMemberShares(p, false)}
                  onLimitChange={(newLimit) => {
                    setShareLimit(newLimit);
                    setShareCurrentPage(1);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessShareSection;
