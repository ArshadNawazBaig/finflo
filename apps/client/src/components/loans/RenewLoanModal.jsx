import { useState, useEffect, useMemo } from 'react';
import {
  RotateCw,
  DollarSign,
  Clock,
  Percent,
  Calendar as CalendarIcon,
  ArrowRight,
  Layers,
  TrendingUp,
} from 'lucide-react';
import UpgradePrompt from '@/components/pricing/UpgradePrompt';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';

// Client-side EMI/total preview — mirrors the server formulas in loanController.
const previewTerms = (principal, rate, duration, interestType) => {
  const p = Number(principal) || 0;
  const r = Number(rate) || 0;
  const d = Number(duration) || 0;
  if (!p || !d) return { emi: 0, totalAmount: 0 };
  if (interestType === 'emi') {
    const m = r / 12 / 100;
    const emi = m === 0 ? p / d : (p * m * (1 + m) ** d) / ((1 + m) ** d - 1);
    return { emi: Math.round(emi), totalAmount: Math.round(emi) * d };
  }
  const totalInterest = (p * r * d) / 1200;
  const totalAmount = p + totalInterest;
  return { emi: Math.round(totalAmount / d), totalAmount: Math.round(totalAmount) };
};

const TYPES = [
  {
    key: 'rollover',
    label: 'Rollover',
    icon: RotateCw,
    blurb: 'Carry the outstanding balance into a fresh loan & term.',
  },
  {
    key: 'topup',
    label: 'Top-up',
    icon: TrendingUp,
    blurb: 'Issue a larger loan; only the extra cash is disbursed.',
  },
  {
    key: 'extend',
    label: 'Extend',
    icon: Layers,
    blurb: 'Keep this loan, push out the term & recompute EMI.',
  },
];

const RenewLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [renewalType, setRenewalType] = useState('rollover');
  const [interestType, setInterestType] = useState('simple');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeData, setUpgradeData] = useState({});

  const outstanding = Math.round(loan?.remainingAmount || 0);

  // Seed defaults from the source loan whenever it opens.
  useEffect(() => {
    if (isOpen && loan) {
      setRenewalType('rollover');
      setInterestType(loan.interestType || 'simple');
      setRate(loan.rate != null ? String(loan.rate) : '');
      setDuration(loan.duration ? String(loan.duration) : '');
      setPrincipal('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError('');
    }
  }, [isOpen, loan]);

  const maturityDate = useMemo(() => {
    if (!loan?.startDate || !loan?.duration) return null;
    const d = new Date(loan.startDate);
    d.setMonth(d.getMonth() + Number(loan.duration));
    return d;
  }, [loan]);

  // Effective principal for the preview depends on renewal type.
  const effectivePrincipal =
    renewalType === 'rollover'
      ? outstanding
      : renewalType === 'extend'
        ? loan?.principal || 0
        : Number(principal) || 0;

  const preview = previewTerms(
    effectivePrincipal,
    rate,
    duration,
    interestType,
  );
  const extraCash = Math.max(0, (Number(principal) || 0) - outstanding);

  if (!loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (renewalType === 'topup') {
      if (!Number(principal) || Number(principal) <= outstanding) {
        setError(
          `Top-up amount must be greater than the outstanding balance (${formatCurrency(outstanding)}).`,
        );
        return;
      }
    }
    if (!Number(duration) || Number(duration) < 1) {
      setError('Enter a valid term in months.');
      return;
    }

    const payload = {
      renewalType,
      duration: Number(duration),
      rate: rate === '' ? undefined : Number(rate),
      interestType,
      notes: notes || undefined,
    };
    if (renewalType === 'topup') payload.principal = Number(principal);
    if (renewalType !== 'extend') payload.startDate = startDate;

    try {
      setLoading(true);
      const { data } = await api.patch(`/loans/${loan._id}/renew`, payload);
      toast.success(
        renewalType === 'extend'
          ? 'Loan term extended'
          : 'Loan renewed successfully',
      );
      onSuccess?.(data);
      onClose();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.upgradeRequired) {
        setUpgradeData({
          plan: err.response.data.plan,
          limit: err.response.data.limit,
          current: err.response.data.current,
          feature: 'loans',
        });
        setShowUpgradePrompt(true);
      } else {
        setError(err.response?.data?.message || 'Failed to renew loan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <RotateCw />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5">
              Renew Loan
            </p>
            <DialogTitle>Renew Loan</DialogTitle>
            <DialogDescription className="mt-1">
              Roll over, top-up, or extend loan #
              {loan._id?.toString().slice(-6).toUpperCase()}.
            </DialogDescription>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {error && (
            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-xs font-bold border border-rose-500/20 mb-5 animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          {/* Source loan summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Principal
              </div>
              <div className="text-sm font-black mt-1">
                {formatCurrency(loan.principal || 0)}
              </div>
            </div>
            <div className="p-3 rounded-2xl border border-orange-200/40 bg-orange-500/[0.06]">
              <div className="text-[9px] font-black uppercase tracking-widest text-orange-600">
                Outstanding
              </div>
              <div className="text-sm font-black text-orange-600 mt-1">
                {formatCurrency(outstanding)}
              </div>
            </div>
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Maturity
              </div>
              <div className="text-xs font-black mt-1">
                {maturityDate
                  ? maturityDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </div>
            </div>
          </div>

          <form id="renew-loan-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Renewal type */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Renewal Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = renewalType === t.key;
                  return (
                    <Button
                      key={t.key}
                      type="button"
                      variant="ghost"
                      onClick={() => setRenewalType(t.key)}
                      className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border text-xs font-bold transition-all ${
                        active
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                          : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                {TYPES.find((t) => t.key === renewalType)?.blurb}
              </p>
            </div>

            {/* Carried amount (rollover) */}
            {renewalType === 'rollover' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> Carried-Over
                  Principal
                </label>
                <div className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] text-sm font-bold text-slate-600 dark:text-slate-300">
                  {formatCurrency(outstanding)}
                </div>
              </div>
            )}

            {/* New principal (topup) */}
            {renewalType === 'topup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> New Total
                  Principal
                </label>
                <Input
                  type="number"
                  min={outstanding + 1}
                  placeholder={`Greater than ${formatCurrency(outstanding)}`}
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                />
                {Number(principal) > outstanding && (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pl-1">
                    Extra cash disbursed: {formatCurrency(extraCash)} (outstanding{' '}
                    {formatCurrency(outstanding)} settled into the new loan)
                  </p>
                )}
              </div>
            )}

            {/* Interest type — hidden for extend keeps it simple but allowed */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-500" /> Interest Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {['simple', 'emi', 'compound'].map((it) => (
                  <Button
                    key={it}
                    type="button"
                    variant="ghost"
                    onClick={() => setInterestType(it)}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold capitalize transition-all ${
                      interestType === it
                        ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {it === 'emi' ? 'EMI' : it}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rate & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Percent className="w-3 h-3 text-indigo-500" /> Rate (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Term (Months)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                />
              </div>
            </div>

            {/* Start date — not for extend (same record keeps its dates) */}
            {renewalType !== 'extend' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> New Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all text-slate-500 dark:text-slate-400 h-auto"
                />
              </div>
            )}

            {/* Live preview */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04]">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
                  New EMI
                </div>
                <div className="text-base font-black mt-0.5">
                  {formatCurrency(preview.emi)}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
                  Total Repayable
                </div>
                <div className="text-base font-black mt-0.5">
                  {formatCurrency(preview.totalAmount)}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
              Guarantors carry over from the original loan. Rollover & top-up
              close this loan (marked “Renewed”) and create a new active loan;
              extend keeps this same loan.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Notes (optional)
              </label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
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
            form="renew-loan-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <RotateCw size={14} />}
            {renewalType === 'extend' ? 'Extend Loan' : 'Renew Loan'}
          </Button>
        </div>
      </DialogContent>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        plan={upgradeData.plan}
        limit={upgradeData.limit}
        current={upgradeData.current}
        feature={upgradeData.feature}
      />
    </Dialog>
  );
};

export default RenewLoanModal;
