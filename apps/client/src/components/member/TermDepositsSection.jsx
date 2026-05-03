import { Wallet, X, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

const TermDepositsSection = ({
  showTermDepositForm,
  setShowTermDepositForm,
  handleCreateTermDeposit,
  tdPrincipal,
  setTdPrincipal,
  tdDuration,
  setTdDuration,
  systemSettings,
  tdSourceAccount,
  setTdSourceAccount,
  member,
  tdNotes,
  setTdNotes,
  isSubmittingTD,
  termDeposits,
  isMaturingTD,
  handleMatureTermDeposit,
  isBreakingTD,
  setBreakTDTarget,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-emerald-500/20 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
            <Wallet size={20} className="text-emerald-500" />
            Term Deposits
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Locked capital for fixed durations at guaranteed profit rates.
          </p>
        </div>
        <button
          onClick={() => setShowTermDepositForm(!showTermDepositForm)}
          className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
        >
          {showTermDepositForm ? (
            <X size={14} />
          ) : (
            <ArrowUpCircle size={14} />
          )}
          {showTermDepositForm ? ' Cancel' : ' New Deposit'}
        </button>
      </div>

      {/* Create Form */}
      {showTermDepositForm && (
        <form
          onSubmit={handleCreateTermDeposit}
          className="p-6 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 animate-in zoom-in-95 duration-300 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Principal Amount
              </label>
              <input
                type="number"
                required
                min="1"
                value={tdPrincipal}
                onChange={(e) => setTdPrincipal(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Enter amount..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Duration & Rate
              </label>
              <select
                required
                value={tdDuration}
                onChange={(e) => setTdDuration(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
              >
                {(systemSettings?.termDepositRates || []).map((r) => (
                  <option key={r.duration} value={r.duration}>
                    {r.duration} Months @ {r.rate}% p.a.
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Source Account
              </label>
              <select
                required
                value={tdSourceAccount}
                onChange={(e) => setTdSourceAccount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
              >
                <option value="current">
                  Current ({formatCurrency(member.currentBalance)})
                </option>
                <option value="saving">
                  Saving ({formatCurrency(member.savingBalance)})
                </option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Internal Notes (Optional)
              </label>
              <input
                type="text"
                value={tdNotes}
                onChange={(e) => setTdNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="e.g. Special request"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              isLoading={isSubmittingTD}
              variant="gradient"
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 px-8"
            >
              Lock Funds
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {termDeposits.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              No term deposits
            </p>
          </div>
        ) : (
          termDeposits.map((td) => (
            <div
              key={td._id}
              className={`p-4 sm:p-5 rounded-2xl border ${td.status === 'active' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/50 bg-muted/20'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 group`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${td.status === 'active' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                >
                  {td.duration}M
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight">
                    {formatCurrency(td.principal)}
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    {td.depositNumber} • {td.profitRate}% p.a. •{' '}
                    {new Date(td.maturityDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between sm:justify-end">
                <div className="text-right">
                  <div
                    className={`text-sm font-black ${td.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}
                  >
                    {td.status === 'active'
                      ? formatCurrency(td.projectedProfit)
                      : formatCurrency(td.actualProfit)}
                  </div>
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                    {td.status === 'active'
                      ? 'Proj. Profit'
                      : 'Actual Profit'}
                  </div>
                </div>

                {td.status === 'active' ? (
                  <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {new Date() >= new Date(td.maturityDate) ? (
                      <Button
                        size="sm"
                        isLoading={isMaturingTD === td._id}
                        onClick={() => handleMatureTermDeposit(td._id)}
                        className="bg-emerald-600 text-white h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-4 hover:bg-emerald-700"
                      >
                        Mature
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        isLoading={isBreakingTD === td._id}
                        onClick={() => setBreakTDTarget(td)}
                        variant="outline"
                        className="h-8 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-wider rounded-lg px-4"
                      >
                        Break (Pen: {td.earlyBreakPenaltyRate}%)
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                    {td.status}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TermDepositsSection;
