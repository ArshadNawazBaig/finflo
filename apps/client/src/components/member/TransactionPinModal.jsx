import { useState, useRef, useEffect } from 'react';
import { Lock, ShieldAlert, Mail, Loader2, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TransactionPinModal = ({ isOpen, onClose, onVerified }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);

  // OTP reset flow
  const [showOtpReset, setShowOtpReset] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [resetLoading, setResetLoading] = useState(false);

  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const newPinRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
      setAttemptsRemaining(null);
      setShake(false);
      setLocked(false);
      setShowOtpReset(false);
      setOtp('');
      setNewPin(['', '', '', '']);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  const handlePinChange = (index, value, refs, setter, state) => {
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

  const handleVerify = async () => {
    const pinStr = pin.join('');
    if (pinStr.length !== 4) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/members/portal/verify-pin', { pin: pinStr });
      onVerified(data.token, data.expiresIn);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === 'PIN_LOCKED') {
        setLocked(true);
        setLockedUntil(resp.lockedUntil);
        setError(resp.message);
      } else {
        setError(resp?.message || 'Verification failed.');
        setAttemptsRemaining(resp?.attemptsRemaining ?? null);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin(['', '', '', '']);
        setTimeout(() => inputRefs[0].current?.focus(), 100);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all 4 digits entered
  useEffect(() => {
    if (pin.every((d) => d !== '') && !loading) handleVerify();
  }, [pin]);

  const handleRequestOtp = async () => {
    setOtpSending(true);
    try {
      await api.post('/members/portal/pin-reset-otp');
      toast.success('OTP sent to your registered email.');
      setShowOtpReset(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleResetPin = async () => {
    const newPinStr = newPin.join('');
    if (otp.length !== 6 || newPinStr.length !== 4) return;

    setResetLoading(true);
    try {
      await api.post('/members/portal/pin-reset-verify', { otp, newPin: newPinStr });
      toast.success('PIN reset successfully! Please verify your new PIN.');
      setShowOtpReset(false);
      setLocked(false);
      setError('');
      setPin(['', '', '', '']);
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset PIN.');
    } finally {
      setResetLoading(false);
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
          onChange={(e) => handlePinChange(i, e.target.value, refs, setter, values)}
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
          <div className={cn(
            'h-9 w-9 rounded-full mx-auto flex items-center justify-center mb-3 [&_svg]:w-3.5 [&_svg]:h-3.5',
            locked ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400' : 'bg-primary/10 text-primary',
          )}>
            {locked ? <ShieldAlert /> : <Lock />}
          </div>
          <p className={cn(
            'text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5',
            locked ? 'text-rose-500 dark:text-rose-400' : 'text-primary',
          )}>
            {showOtpReset ? 'PIN recovery' : locked ? 'Locked' : 'Authorize'}
          </p>
          <DialogTitle>
            {showOtpReset ? 'Reset PIN' : 'Enter PIN'}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            {showOtpReset
              ? 'Enter the OTP sent to your email and set a new PIN'
              : 'Enter your 4-digit transaction PIN to continue'}
          </p>
        </div>

        <div className="space-y-4">
          {!showOtpReset ? (
            <>
              {/* PIN Input */}
              <div className={cn(shake && 'animate-shake')}>
                {renderPinInputs(pin, inputRefs, setPin)}
              </div>

              {error && (
                <p className="text-[10px] text-center text-rose-500 font-bold">{error}</p>
              )}
              {attemptsRemaining !== null && !locked && (
                <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 font-bold">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                </p>
              )}

              {loading && (
                <div className="flex justify-center">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              )}

              {/* Forgot PIN / OTP Reset */}
              <Button
                type="button"
                variant="ghost"
                onClick={handleRequestOtp}
                disabled={otpSending}
                className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors py-2 flex items-center justify-center gap-2"
              >
                {otpSending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Mail size={12} />
                )}
                Forgot PIN? Reset via Email
              </Button>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  6-digit OTP
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-center text-lg font-extrabold tabular-nums tracking-[0.5em] focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="● ● ● ● ● ●"
                  autoFocus
                />
              </div>

              {/* New PIN */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <KeyRound size={10} /> New 4-digit PIN
                </label>
                {renderPinInputs(newPin, newPinRefs, setNewPin)}
              </div>

              <Button
                onClick={handleResetPin}
                isLoading={resetLoading}
                disabled={otp.length !== 6 || newPin.some((d) => !d)}
                className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Reset & Set New PIN
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowOtpReset(false)}
                className="w-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-1"
              >
                ← Back to PIN entry
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionPinModal;
