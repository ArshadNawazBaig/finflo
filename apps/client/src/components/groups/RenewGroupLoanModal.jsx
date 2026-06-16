import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Percent,
  Clock,
  Calendar as CalendarIcon,
  Loader2,
  RotateCcw,
  TrendingUp,
  CalendarPlus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';

// Renewal types mirror individual loans: rollover carries the outstanding into a
// fresh term (no cash), topup lends more (disburses the difference), extend just
// re-amortizes the current cycle to a longer term in place.
const RENEWAL_TYPES = [
  {
    value: 'rollover',
    label: 'Rollover',
    icon: RotateCcw,
    hint: 'Carry each member’s outstanding into a fresh term. No new cash.',
    active: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500',
  },
  {
    value: 'topup',
    label: 'Top-up',
    icon: TrendingUp,
    hint: 'Lend more per member; only the amount above their outstanding is disbursed.',
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500',
  },
  {
    value: 'extend',
    label: 'Extend',
    icon: CalendarPlus,
    hint: 'Push the current cycle to a longer term in place. No new cycle, no cash.',
    active: 'border-blue-500/40 bg-blue-500/10 text-blue-500 ring-2 ring-blue-500/20 hover:bg-blue-500/10 hover:text-blue-500',
  },
];

const RenewGroupLoanModal = ({ isOpen, onClose, onSuccess, groupLoan }) => {
  const [renewalType, setRenewalType] = useState('rollover');
  const [rate, setRate] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  // Map of subLoanId -> new principal string (top-up only).
  const [principals, setPrincipals] = useState({});
  const [detail, setDetail] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !groupLoan?._id) return;
    setRenewalType('rollover');
    setRate(groupLoan.rate != null ? String(groupLoan.rate) : '');
    setDuration(groupLoan.duration != null ? String(groupLoan.duration) : '');
    setStartDate(new Date());
    setPrincipals({});
    setDetail(null);

    const fetchDetail = async () => {
      setFetching(true);
      try {
        const { data } = await api.get(`/groups/loans/${groupLoan._id}`);
        setDetail(data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load loan cycle');
      } finally {
        setFetching(false);
      }
    };
    fetchDetail();
  }, [isOpen, groupLoan]);

  // Sub-loans that still carry a balance are renewable.
  const renewableSubLoans = useMemo(
    () =>
      (detail?.allocations || []).filter(
        (a) => a.loan && ['active', 'overdue'].includes(a.loan.status),
      ),
    [detail],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupLoan?._id) return;

    const payload = {
      renewalType,
      rate: rate === '' ? undefined : Number(rate),
      duration: duration === '' ? undefined : Number(duration),
      startDate: startDate.toISOString().split('T')[0],
    };

    if (renewalType === 'topup') {
      const allocations = renewableSubLoans
        .map((a) => ({
          loan: a.loan._id,
          principal: parseFloat(principals[a.loan._id]),
        }))
        .filter((al) => al.principal > 0);
      if (allocations.length === 0) {
        toast.error('Enter a new principal for at least one member.');
        return;
      }
      payload.allocations = allocations;
    }

    setLoading(true);
    try {
      await api.post(`/groups/loans/${groupLoan._id}/renew`, payload);
      toast.success('Group loan renewed');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to renew group loan');
    } finally {
      setLoading(false);
    }
  };

  const activeType = RENEWAL_TYPES.find((t) => t.value === renewalType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] !p-0 !gap-0 flex flex-col overflow-hidden">
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <RefreshCw />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5">
              Renew Cycle
            </p>
            <DialogTitle>Renew Group Loan</DialogTitle>
            <DialogDescription className="mt-1">
              {detail?.group?.name
                ? capitalize(detail.group.name)
                : 'Restructure this loan cycle for every member.'}
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {fetching ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : (
            <form id="renew-group-loan-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Renewal type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Renewal Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {RENEWAL_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <Button
                        key={t.value}
                        type="button"
                        variant="ghost"
                        onClick={() => setRenewalType(t.value)}
                        className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                          renewalType === t.value
                            ? t.active
                            : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon size={15} />
                        {t.label}
                      </Button>
                    );
                  })}
                </div>
                {activeType && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed pt-1">
                    {activeType.hint}
                  </p>
                )}
              </div>

              {/* New rate & duration */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={
                    <>
                      <Percent className="w-3 h-3 text-indigo-500" /> Rate (%)
                    </>
                  }
                  htmlFor="renew-rate"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                >
                  <Input
                    id="renew-rate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </FormField>
                <FormField
                  label={
                    <>
                      <Clock className="w-3 h-3" /> Term (Months)
                    </>
                  }
                  htmlFor="renew-duration"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                >
                  <Input
                    id="renew-duration"
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </FormField>
              </div>

              {/* Start date (rollover / top-up open a new cycle) */}
              {renewalType !== 'extend' && (
                <FormField
                  label={
                    <>
                      <CalendarIcon className="w-3 h-3" /> New Commencement
                    </>
                  }
                  htmlFor="renew-start-date"
                  labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                >
                  <Input
                    id="renew-start-date"
                    type="date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-500 dark:text-slate-400"
                  />
                </FormField>
              )}

              {/* Per-member outstanding + top-up principal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  {renewalType === 'topup'
                    ? 'New Per-Member Principal'
                    : 'Members & Outstanding'}
                </label>
                <div className="mt-1 rounded-2xl border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {renewableSubLoans.length === 0 && (
                    <p className="px-4 py-5 text-center text-[11px] font-semibold text-slate-400">
                      No outstanding sub-loans to renew.
                    </p>
                  )}
                  {renewableSubLoans.map((a) => (
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
                      {renewalType === 'topup' ? (
                        <Input
                          type="number"
                          min="0"
                          placeholder="New principal"
                          value={principals[a.loan._id] || ''}
                          onChange={(e) =>
                            setPrincipals((prev) => ({
                              ...prev,
                              [a.loan._id]: e.target.value,
                            }))
                          }
                          className="h-auto w-32 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold text-right focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
                          {renewalType === 'rollover'
                            ? formatCurrency(a.loan.remainingAmount || 0)
                            : `${duration || a.loan.duration} mo`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {renewalType === 'topup' && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed pt-1">
                    Each new principal must exceed that member’s outstanding; only
                    the difference is disbursed.
                  </p>
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
            form="renew-group-loan-form"
            type="submit"
            isLoading={loading}
            disabled={fetching}
            className="h-11 px-7 rounded-full font-bold text-sm bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <RefreshCw size={14} />}
            Renew Cycle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RenewGroupLoanModal;
