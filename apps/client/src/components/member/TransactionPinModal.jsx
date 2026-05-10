import { useState, useRef, useEffect } from 'react';
import { Lock, ShieldAlert, Mail, Loader2, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
    <div className="flex gap-3 justify-center">
      {values.map((digit, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(i, e.target.value, refs, setter, values)}
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
          <div className={cn(
            'w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner',
            locked ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary',
          )}>
            {locked ? <ShieldAlert size={28} /> : <Lock size={28} />}
          </div>
          <DialogTitle className="text-xl font-black">
            {showOtpReset ? 'Reset PIN' : 'Enter PIN'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {showOtpReset
              ? 'Enter the OTP sent to your email and set a new PIN'
              : 'Enter your 4-digit transaction PIN to continue'}
          </p>
        </div>

        <div className="px-8 pb-8 space-y-5">
          {!showOtpReset ? (
            <>
              {/* PIN Input */}
              <div className={cn(shake && 'animate-shake')}>
                {renderPinInputs(pin, inputRefs, setPin)}
              </div>

              {error && (
                <p className="text-xs text-center text-red-500 font-bold">{error}</p>
              )}
              {attemptsRemaining !== null && !locked && (
                <p className="text-[10px] text-center text-amber-600 font-bold">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                </p>
              )}

              {loading && (
                <div className="flex justify-center">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              )}

              {/* Forgot PIN / OTP Reset */}
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpSending}
                className="w-full text-[10px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors py-2 flex items-center justify-center gap-2"
              >
                {otpSending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Mail size={12} />
                )}
                Forgot PIN? Reset via Email
              </button>
            </>
          ) : (
            <>
              {/* OTP Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-5 py-3.5 rounded-2xl border border-border/50 bg-background text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
                  placeholder="● ● ● ● ● ●"
                  autoFocus
                />
              </div>

              {/* New PIN */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <KeyRound size={10} /> New 4-digit PIN
                </label>
                {renderPinInputs(newPin, newPinRefs, setNewPin)}
              </div>

              <Button
                onClick={handleResetPin}
                isLoading={resetLoading}
                disabled={otp.length !== 6 || newPin.some((d) => !d)}
                variant="gradient"
                className="w-full min-h-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px]"
              >
                Reset & Set New PIN
              </Button>

              <button
                type="button"
                onClick={() => setShowOtpReset(false)}
                className="w-full text-[10px] font-bold text-muted-foreground hover:text-foreground py-1"
              >
                ← Back to PIN entry
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionPinModal;
