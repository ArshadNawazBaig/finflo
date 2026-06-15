import { useState, useEffect } from 'react';
import { RotateCw, TrendingUp, DollarSign, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';

const DURATIONS = [3, 6, 9, 12, 18, 24, 36];

const MemberLoanRenewalModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [renewalType, setRenewalType] = useState('rollover');
  const [principal, setPrincipal] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const outstanding = Math.round(loan?.remainingAmount || 0);
  const extraCash = Math.max(0, (Number(principal) || 0) - outstanding);

  useEffect(() => {
    if (isOpen && loan) {
      setRenewalType('rollover');
      setPrincipal('');
      setDuration(loan.duration ? String(loan.duration) : '12');
      setNotes('');
      setError('');
    }
  }, [isOpen, loan]);

  if (!loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (renewalType === 'topup') {
      if (!Number(principal) || Number(principal) <= outstanding) {
        setError(
          `Top-up amount must be greater than your outstanding balance (${formatCurrency(outstanding)}).`,
        );
        return;
      }
    }
    if (!Number(duration) || Number(duration) < 1) {
      setError('Please choose a term.');
      return;
    }

    const payload = {
      renewalType,
      duration: Number(duration),
      notes: notes || undefined,
    };
    if (renewalType === 'topup') payload.principal = Number(principal);

    try {
      setLoading(true);
      await api.post(`/loans/my-loans/${loan._id}/renew-request`, payload);
      toast.success('Renewal request submitted for approval');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit renewal request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] !p-0 !gap-0 flex flex-col overflow-hidden">
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <RotateCw />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5">
              Renew Loan
            </p>
            <DialogTitle>Request Renewal</DialogTitle>
            <DialogDescription className="mt-1">
              Roll over your balance or request extra funds. Sent to your branch
              for approval.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {error && (
            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-xs font-bold border border-rose-500/20 mb-5">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Loan
              </div>
              <div className="text-sm font-black mt-1">
                #{loan._id?.toString().slice(-6).toUpperCase()}
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
          </div>

          <form id="member-renew-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Renewal Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setRenewalType('rollover')}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border text-xs font-bold transition-all ${
                    renewalType === 'rollover'
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                  Rollover
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setRenewalType('topup')}
                  className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border text-xs font-bold transition-all ${
                    renewalType === 'topup'
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Top-up
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                {renewalType === 'rollover'
                  ? 'Carry your outstanding balance into a new loan with a fresh term.'
                  : 'Request a larger loan — the extra cash is paid out, your current balance rolls in.'}
              </p>
            </div>

            {renewalType === 'topup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> New Total
                  Amount
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
                    You&apos;ll receive {formatCurrency(extraCash)} in new
                    funds.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Term (Months)
              </label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold">
                  <SelectValue placeholder="Choose duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Notes (optional)
              </label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purpose of renewal..."
                className="px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
              Your interest rate is set by your branch. Guarantors carry over
              from your current loan.
            </p>
          </form>
        </div>

        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="member-renew-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <RotateCw size={14} />}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberLoanRenewalModal;
