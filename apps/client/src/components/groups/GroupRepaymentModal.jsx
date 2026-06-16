import { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Wallet,
  Users,
  User,
  Loader2,
  ArrowDownCircle,
  CreditCard,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';

const GroupRepaymentModal = ({ isOpen, onClose, onSuccess, groupLoan }) => {
  const [mode, setMode] = useState('group'); // 'group' | 'member'
  const [amount, setAmount] = useState('');
  // Map of subLoanId -> amount string for per-member mode.
  const [allocations, setAllocations] = useState({});
  // Group-wide "settle the entire cycle" toggle.
  const [settleAll, setSettleAll] = useState(false);
  // Map of subLoanId -> bool for per-member settlement.
  const [settleMap, setSettleMap] = useState({});
  // How the money was received: 'cash' (teller collection) | 'online'.
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // Only meaningful for online payments — pull from the member's wallet balance.
  const [deductFromWallet, setDeductFromWallet] = useState(false);
  const [detail, setDetail] = useState(null);
  // Early-settlement payoff quote (exact discounted figures per member + total).
  const [quote, setQuote] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !groupLoan?._id) return;
    setMode('group');
    setAmount('');
    setAllocations({});
    setSettleAll(false);
    setSettleMap({});
    setPaymentMethod('cash');
    setDeductFromWallet(false);
    setDetail(null);
    setQuote(null);

    const fetchDetail = async () => {
      setFetching(true);
      try {
        const [{ data: cycle }, quoteRes] = await Promise.all([
          api.get(`/groups/loans/${groupLoan._id}`),
          // Best-effort: the payoff quote is informational, so a failure here
          // must not block recording a payment.
          api
            .get(`/groups/loans/${groupLoan._id}/settlement-quote`)
            .catch(() => null),
        ]);
        setDetail(cycle);
        if (quoteRes?.data) setQuote(quoteRes.data);
      } catch (err) {
        toast.error(
          err.response?.data?.message || 'Failed to load loan cycle',
        );
      } finally {
        setFetching(false);
      }
    };
    fetchDetail();
  }, [isOpen, groupLoan]);

  // subLoanId -> { outstanding, payoff, discount } from the settlement quote.
  const payoffByLoan = useMemo(() => {
    const map = {};
    (quote?.allocations || []).forEach((a) => {
      map[String(a.loan)] = a;
    });
    return map;
  }, [quote]);

  // Sub-loans that still have an outstanding balance are collectible.
  const activeSubLoans = useMemo(
    () =>
      (detail?.allocations || []).filter(
        (a) => a.loan && a.loan.status !== 'completed',
      ),
    [detail],
  );

  // Total outstanding across the cycle — the contractual remaining the group
  // still owes (an early settlement pays less, recalculated server-side).
  const totalOutstanding = useMemo(
    () =>
      activeSubLoans.reduce((sum, a) => sum + (a.loan.remainingAmount || 0), 0),
    [activeSubLoans],
  );

  const totalPerMember = useMemo(
    () =>
      Object.values(allocations).reduce(
        (sum, v) => sum + (parseFloat(v) || 0),
        0,
      ),
    [allocations],
  );

  // The exact payoff (and discount vs. outstanding) for whatever is currently
  // being settled — the whole cycle in group mode, or the toggled members in
  // per-member mode. `payoff: null` means the quote hasn't loaded yet.
  const settlementPayoff = useMemo(() => {
    if (mode === 'group') {
      if (!settleAll) return null;
      return {
        payoff: quote?.totalPayoff ?? null,
        discount: quote?.totalDiscount ?? 0,
      };
    }
    const toggled = activeSubLoans.filter((a) => settleMap[a.loan._id]);
    if (toggled.length === 0) return null;
    let payoff = 0;
    let discount = 0;
    let known = true;
    toggled.forEach((a) => {
      const q = payoffByLoan[String(a.loan._id)];
      if (!q) {
        known = false;
        return;
      }
      payoff += q.payoff;
      discount += q.discount;
    });
    return { payoff: known ? payoff : null, discount };
  }, [mode, settleAll, settleMap, quote, activeSubLoans, payoffByLoan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupLoan?._id) return;

    let payload;
    if (mode === 'group') {
      if (settleAll) {
        payload = { settle: true };
      } else {
        const value = parseFloat(amount);
        if (!value || value <= 0) {
          toast.error('Enter an amount greater than 0.');
          return;
        }
        payload = { amount: value };
      }
    } else {
      const allocs = activeSubLoans
        .map((a) => {
          if (settleMap[a.loan._id]) return { loan: a.loan._id, settle: true };
          const amt = parseFloat(allocations[a.loan._id]);
          return amt > 0 ? { loan: a.loan._id, amount: amt } : null;
        })
        .filter(Boolean);
      if (allocs.length === 0) {
        toast.error('Enter an amount or settle at least one member.');
        return;
      }
      payload = { allocations: allocs };
    }

    // Wallet deduction only applies to online payments; cash is a physical
    // collection that never touches the member's wallet.
    payload.paymentMethod = paymentMethod;
    payload.deductFromWallet = paymentMethod === 'online' && deductFromWallet;

    setLoading(true);
    try {
      const { data } = await api.post(
        `/groups/loans/${groupLoan._id}/repayment`,
        payload,
      );
      const collected = data?.collected;
      toast.success(
        typeof collected === 'number'
          ? `Collected ${formatCurrency(collected)}`
          : 'Payment recorded successfully',
      );
      if (data?.shortfall > 0) {
        toast.warning(
          `${formatCurrency(data.shortfall)} could not be applied (exceeded outstanding).`,
        );
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const isSettling = mode === 'group' ? settleAll : Object.values(settleMap).some(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] !p-0 !gap-0 flex flex-col overflow-hidden">
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5 ${
              isSettling
                ? 'bg-blue-500/10 text-blue-500'
                : 'bg-emerald-500/10 text-emerald-500'
            }`}
          >
            {isSettling ? <ArrowDownCircle /> : <Banknote />}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 ${
                isSettling ? 'text-blue-500' : 'text-emerald-500'
              }`}
            >
              {isSettling ? 'Early Settlement' : 'Record Payment'}
            </p>
            <DialogTitle>Group Repayment</DialogTitle>
            <DialogDescription className="mt-1">
              {detail?.group?.name
                ? capitalize(detail.group.name)
                : 'Collect a repayment for this loan cycle.'}
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {fetching ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            <form
              id="group-repayment-form"
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Cycle outstanding summary — when settling, also show the exact
                  discounted payoff and the saving vs. the outstanding. */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Cycle Outstanding
                  </span>
                  <span
                    className={`text-lg font-extrabold tracking-tight tabular-nums ${
                      settlementPayoff
                        ? 'text-slate-400 dark:text-slate-500 line-through decoration-1'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatCurrency(totalOutstanding)}
                  </span>
                </div>
                {settlementPayoff && (
                  <>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-500">
                        Settlement Payoff
                      </span>
                      <span className="text-lg font-extrabold tracking-tight tabular-nums text-blue-600 dark:text-blue-400">
                        {settlementPayoff.payoff === null
                          ? '—'
                          : formatCurrency(settlementPayoff.payoff)}
                      </span>
                    </div>
                    {settlementPayoff.payoff !== null &&
                      settlementPayoff.discount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-500">
                            Early-Payoff Saving
                          </span>
                          <span className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            −{formatCurrency(settlementPayoff.discount)}
                          </span>
                        </div>
                      )}
                  </>
                )}
              </div>

              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('group')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    mode === 'group'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 ring-2 ring-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600'
                      : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Users size={14} /> Group Payment
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('member')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    mode === 'member'
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 ring-2 ring-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-600'
                      : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <User size={14} /> Per Member
                </Button>
              </div>

              {mode === 'group' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Total Amount
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 25000"
                      value={amount}
                      disabled={settleAll}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                      Waterfalls across members by their outstanding share.
                    </p>
                  </div>

                  {/* Settle entire cycle */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSettleAll((v) => !v)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all ${
                      settleAll
                        ? 'border-blue-500/40 bg-blue-500/5'
                        : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 text-left">
                      <ArrowDownCircle
                        size={16}
                        className={settleAll ? 'text-blue-500' : 'text-slate-400'}
                      />
                      <span>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          Early settlement — settle entire cycle
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          {settleAll
                            ? 'Pays off every member at the discounted payoff.'
                            : 'Recalculate interest to today and close all loans.'}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${
                        settleAll ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/[0.12]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          settleAll ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Per-Member Amount
                  </label>
                  <div className="mt-1 rounded-2xl border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {activeSubLoans.length === 0 && (
                      <p className="px-4 py-5 text-center text-[11px] font-semibold text-slate-400">
                        No outstanding sub-loans to collect.
                      </p>
                    )}
                    {activeSubLoans.map((a) => {
                      const settling = !!settleMap[a.loan._id];
                      const q = payoffByLoan[String(a.loan._id)];
                      return (
                        <div
                          key={a.loan._id}
                          className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold capitalize text-slate-900 dark:text-white truncate">
                              {capitalize(a.customer?.name || 'Member')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Outstanding{' '}
                              {formatCurrency(a.loan.remainingAmount || 0)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                setSettleMap((prev) => ({
                                  ...prev,
                                  [a.loan._id]: !prev[a.loan._id],
                                }))
                              }
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                settling
                                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-600'
                                  : 'border-slate-100 dark:border-white/[0.06] text-slate-400 hover:text-blue-500 hover:border-blue-500/30'
                              }`}
                            >
                              Settle
                            </Button>
                            {settling ? (
                              <div className="w-24 px-2 py-1.5 rounded-xl bg-blue-500/5 border border-blue-500/30 text-right">
                                <span className="block text-[8px] font-bold uppercase tracking-wider text-blue-500/70 leading-none">
                                  Payoff
                                </span>
                                <span className="block text-xs font-extrabold tabular-nums text-blue-600 dark:text-blue-400 leading-tight">
                                  {q ? formatCurrency(q.payoff) : '—'}
                                </span>
                              </div>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={allocations[a.loan._id] || ''}
                                onChange={(e) =>
                                  setAllocations((prev) => ({
                                    ...prev,
                                    [a.loan._id]: e.target.value,
                                  }))
                                }
                                className="h-auto w-24 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold text-right focus:ring-2 focus:ring-primary/20 transition-all"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between px-1 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total (excl. settlements)
                    </span>
                    <span className="text-sm font-black text-primary">
                      {formatCurrency(totalPerMember)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment method — how the money was received. */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setDeductFromWallet(false);
                    }}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 ring-2 ring-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600'
                        : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Banknote size={14} /> Cash
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPaymentMethod('online')}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'online'
                        ? 'border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/20 hover:bg-primary/10 hover:text-primary'
                        : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <CreditCard size={14} /> Online
                  </Button>
                </div>

                {/* Wallet deduction is only meaningful for an online payment —
                    cash is a physical collection that never touches the wallet. */}
                {paymentMethod === 'online' && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeductFromWallet((v) => !v)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all ${
                      deductFromWallet
                        ? 'border-primary/40 bg-primary/5 hover:bg-primary/5'
                        : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 text-left">
                      <Wallet
                        size={16}
                        className={
                          deductFromWallet ? 'text-primary' : 'text-slate-400'
                        }
                      />
                      <span>
                        <span className="block text-xs font-bold text-slate-900 dark:text-white">
                          Deduct from member wallet
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          {deductFromWallet
                            ? 'Wallet balance will be charged.'
                            : 'Off — recorded as an external online payment.'}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${
                        deductFromWallet
                          ? 'bg-primary'
                          : 'bg-slate-200 dark:bg-white/[0.12]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          deductFromWallet ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="group-repayment-form"
            type="submit"
            isLoading={loading}
            disabled={fetching}
            className={`h-11 px-7 rounded-full font-bold text-sm text-white hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 ${
              isSettling
                ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)]'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]'
            }`}
          >
            {!loading &&
              (isSettling ? <ArrowDownCircle size={14} /> : <Banknote size={14} />)}
            {isSettling ? 'Settle Loans' : 'Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupRepaymentModal;
