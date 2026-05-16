import { useState, useRef, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  ShieldAlert,
  Mail,
  Loader2,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { memberAtom } from '@/atoms';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn, capitalize } from '@/lib/utils';
import MemberAvatar from '@/components/member/MemberAvatar';
import { clearAppUnlocked } from '@/lib/appLock';

const PinDigits = ({ values, refs, onChange, onKeyDown }) => (
  <div className="flex gap-3 justify-center">
    {values.map((digit, i) => (
      <input
        key={i}
        ref={refs[i]}
        type="password"
        inputMode="numeric"
        maxLength={1}
        value={digit}
        onChange={(e) => onChange(i, e.target.value)}
        onKeyDown={(e) => onKeyDown(i, e)}
        className={cn(
          'text-center font-extrabold rounded-2xl border bg-white dark:bg-white/[0.02] w-14 h-16 text-2xl transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
          digit
            ? 'border-primary/40'
            : 'border-slate-100 dark:border-white/[0.06]',
        )}
      />
    ))}
  </div>
);

const AppLockScreen = ({ onUnlock }) => {
  const member = useAtomValue(memberAtom);
  const setMember = useSetAtom(memberAtom);
  const navigate = useNavigate();

  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);

  // OTP reset flow — same UX as the transaction PIN modal so it feels familiar.
  const [showOtpReset, setShowOtpReset] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [resetLoading, setResetLoading] = useState(false);

  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const newPinRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    const t = setTimeout(() => inputRefs[0].current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  const makeChangeHandler = (refs, setter, state) => (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...state];
    next[index] = value.slice(-1);
    setter(next);
    if (value && index < 3) refs[index + 1].current?.focus();
  };

  const makeKeyHandler = (refs, setter, state) => (index, e) => {
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
      await api.post('/members/portal/verify-pin', { pin: pinStr });
      onUnlock();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === 'PIN_LOCKED') {
        setLocked(true);
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

  useEffect(() => {
    if (pin.every((d) => d !== '') && !loading) handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await api.post('/members/portal/pin-reset-verify', {
        otp,
        newPin: newPinStr,
      });
      toast.success('PIN reset. Enter your new PIN to continue.');
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

  const handleSignOut = () => {
    clearAppUnlocked();
    setMember(null);
    navigate('/member/login');
  };

  const onChangePin = makeChangeHandler(inputRefs, setPin, pin);
  const onKeyPin = makeKeyHandler(inputRefs, setPin, pin);
  const onChangeNewPin = makeChangeHandler(newPinRefs, setNewPin, newPin);
  const onKeyNewPin = makeKeyHandler(newPinRefs, setNewPin, newPin);

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05] pointer-events-none text-slate-900 dark:text-white"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Member identity */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <MemberAvatar
              name={member?.name}
              profilePicture={member?.profilePicture}
              size={72}
              rounded="rounded-3xl"
            />
            <span
              className={cn(
                'absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-950',
                locked
                  ? 'bg-rose-500 text-white'
                  : 'bg-primary text-white',
              )}
            >
              {locked ? <ShieldAlert size={13} /> : <Lock size={13} />}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {locked ? 'Locked out' : 'App locked'}
            </p>
            <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mt-1 capitalize">
              {capitalize(member?.name) || 'Welcome back'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {showOtpReset
                ? 'Enter the OTP sent to your email and set a new PIN'
                : 'Enter your 4-digit PIN to continue'}
            </p>
          </div>
        </div>

        {!showOtpReset ? (
          <>
            <div className={cn(shake && 'animate-shake')}>
              <PinDigits
                values={pin}
                refs={inputRefs}
                onChange={onChangePin}
                onKeyDown={onKeyPin}
              />
            </div>

            {error && (
              <p className="text-[11px] text-center text-rose-500 font-bold">
                {error}
              </p>
            )}
            {attemptsRemaining !== null && !locked && (
              <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 font-bold">
                {attemptsRemaining} attempt
                {attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}

            {loading && (
              <div className="flex justify-center">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            )}

            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={otpSending}
              className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 hover:text-primary transition-colors py-2 flex items-center justify-center gap-2"
            >
              {otpSending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Mail size={12} />
              )}
              Forgot PIN? Reset via email
            </button>
          </>
        ) : (
          <div className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                6-digit OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-center text-lg font-extrabold tabular-nums tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="● ● ● ● ● ●"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <KeyRound size={10} /> New 4-digit PIN
              </label>
              <PinDigits
                values={newPin}
                refs={newPinRefs}
                onChange={onChangeNewPin}
                onKeyDown={onKeyNewPin}
              />
            </div>
            <Button
              onClick={handleResetPin}
              isLoading={resetLoading}
              disabled={otp.length !== 6 || newPin.some((d) => !d)}
              className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Reset &amp; set new PIN
            </Button>
            <button
              type="button"
              onClick={() => setShowOtpReset(false)}
              className="w-full text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-1"
            >
              ← Back to PIN entry
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 mx-auto text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors py-2"
        >
          <LogOut size={11} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default AppLockScreen;
