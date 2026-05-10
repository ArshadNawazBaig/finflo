import { useState, useRef, useEffect } from 'react';
import { KeyRound, Loader2, Check, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
    <div className="flex gap-3 justify-center">
      {values.map((digit, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value, refs, setter, values)}
          onKeyDown={(e) => handleKeyDown(i, e, refs, setter, values)}
          className={cn(
            'w-14 h-16 text-center text-2xl font-black rounded-2xl border-2 bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-inner',
            digit ? 'border-primary/40' : 'border-border/50',
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm !p-0 !gap-0 rounded-[2.5rem] overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <DialogTitle className="text-xl font-black">Set Transaction PIN</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {step === 1 && 'Create a 4-digit PIN for secure transactions'}
            {step === 2 && 'Re-enter your PIN to confirm'}
            {step === 3 && 'Enter your account password to confirm'}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={cn(
                'w-2 h-2 rounded-full transition-all',
                step >= s ? 'bg-emerald-500 w-6' : 'bg-muted/40',
              )} />
            ))}
          </div>
        </div>

        <div className="px-8 pb-8 space-y-5">
          {step === 1 && (
            <>
              {renderPinInputs(pin, pinRefs, setPin)}
              <p className="text-[10px] text-center text-muted-foreground/60">
                You'll need this PIN for transfers, withdrawals & repayments
              </p>
            </>
          )}

          {step === 2 && (
            <>
              {renderPinInputs(confirmPin, confirmRefs, setConfirmPin)}
              {error && <p className="text-xs text-center text-red-500 font-bold">{error}</p>}
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <Check size={16} className="text-emerald-500 shrink-0" />
                <p className="text-xs font-bold text-emerald-600">PIN confirmed: ● ● ● ●</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <KeyRound size={10} /> Account Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                  placeholder="Enter your login password"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
              </div>

              {error && <p className="text-xs text-center text-red-500 font-bold">{error}</p>}

              <Button
                onClick={handleSubmit}
                isLoading={loading}
                disabled={!password}
                variant="gradient"
                className="w-full min-h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20"
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
