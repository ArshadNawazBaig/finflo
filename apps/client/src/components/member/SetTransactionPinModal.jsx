import { useState, useRef, useEffect } from 'react';
import { KeyRound, Loader2, Check, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SetTransactionPinModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: enter PIN, 2: confirm PIN, 3: password
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const confirmRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setPassword('');
      setError('');
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (index, value, refs, setter, state) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...state];
    next[index] = value.slice(-1);
    setter(next);
    if (value && index < 3) refs[index + 1].current?.focus();
  };

  const handleKeyDown = (index, e, refs, setter, state) => {
    if (e.key === 'Backspace' && !state[index] && index > 0) {
      refs[index - 1].current?.focus();
      const next = [...state];
      next[index - 1] = '';
      setter(next);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (pin.some((d) => !d)) return;
      setStep(2);
      setConfirmPin(['', '', '', '']);
      setTimeout(() => confirmRefs[0].current?.focus(), 100);
    } else if (step === 2) {
      if (pin.join('') !== confirmPin.join('')) {
        setError('PINs do not match. Please try again.');
        setConfirmPin(['', '', '', '']);
        setTimeout(() => confirmRefs[0].current?.focus(), 100);
        return;
      }
      setError('');
      setStep(3);
    }
  };

  // Auto-advance when 4 digits entered
  useEffect(() => {
    if (step === 1 && pin.every((d) => d !== '')) {
      handleNext();
    }
  }, [pin, step]);

  useEffect(() => {
    if (step === 2 && confirmPin.every((d) => d !== '')) {
      handleNext();
    }
  }, [confirmPin, step]);

  const handleSubmit = async () => {
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/members/portal/set-pin', {
        pin: pin.join(''),
        currentPassword: password,
      });
      toast.success('Transaction PIN set successfully!');
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set PIN.');
    } finally {
      setLoading(false);
    }
  };

  const renderPinInputs = (values, refs, setter) => (
    <div className="flex gap-2 justify-center">
      {values.map((digit, i) => (
        <Input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value, refs, setter, values)}
          onKeyDown={(e) => handleKeyDown(i, e, refs, setter, values)}
          className={cn(
            'text-center font-extrabold rounded-2xl border bg-white dark:bg-white/[0.02] w-12 h-14 text-xl transition-all focus:ring-2 focus:ring-primary/30',
            digit
              ? 'border-primary/40'
              : 'border-slate-100 dark:border-white/[0.06]',
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        {/* Header */}
        <div className="text-center pr-8">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <ShieldCheck />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400 mb-1.5">
            Secure setup
          </p>
          <DialogTitle>Set Transaction PIN</DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            {step === 1 && 'Create a 4-digit PIN for secure transactions'}
            {step === 2 && 'Re-enter your PIN to confirm'}
            {step === 3 && 'Enter your account password to confirm'}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={cn(
                'h-1.5 rounded-full transition-all',
                step >= s ? 'bg-emerald-500 w-6' : 'w-1.5 bg-slate-100 dark:bg-white/[0.06]',
              )} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              {renderPinInputs(pin, pinRefs, setPin)}
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                You'll need this PIN for transfers, withdrawals & repayments
              </p>
            </>
          )}

          {step === 2 && (
            <>
              {renderPinInputs(confirmPin, confirmRefs, setConfirmPin)}
              {error && <p className="text-[10px] text-center text-rose-500 font-bold">{error}</p>}
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 justify-center">
                <Check size={14} className="text-emerald-500 shrink-0" />
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">PIN confirmed: ● ● ● ●</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <KeyRound size={10} /> Account Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                  placeholder="Enter your login password"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
              </div>

              {error && <p className="text-[10px] text-center text-rose-500 font-bold">{error}</p>}

              <Button
                onClick={handleSubmit}
                isLoading={loading}
                disabled={!password}
                className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Set Transaction PIN
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SetTransactionPinModal;
