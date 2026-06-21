/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import StepFrame from '../../business/StepFrame';

const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 4);

const PinStep = ({ member, onNext, onBack }) => {
  const isGoogleAuth = !!member?.isGoogleAuth;
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Google members can't set a PIN here (no password to confirm) — they may
  // continue. Password members must provide a complete, confirmed PIN.
  const canContinue =
    isGoogleAuth ||
    (/^\d{4}$/.test(pin) && pin === confirmPin && !!password);

  const handleContinue = async () => {
    // Google-auth members have no password to verify against — they set a PIN
    // later from Settings. Continue acts as a skip here.
    if (isGoogleAuth) {
      onNext();
      return;
    }

    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    if (!password) {
      setError('Enter your account password to confirm.');
      return;
    }

    try {
      await api.post('/members/portal/set-pin', {
        pin,
        currentPassword: password,
      });
      toast.success('Transaction PIN set');
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set PIN.');
    }
  };

  return (
    <StepFrame
      icon={ShieldCheck}
      eyebrow="Step 5 · Security"
      title="Set a transaction PIN"
      description="Your 4-digit PIN protects every transfer and withdrawal. You can change it anytime in Settings."
      onPrimary={handleContinue}
      onBack={onBack}
      primaryDisabled={!canContinue}
      primaryLabel={isGoogleAuth ? 'Continue' : 'Set PIN'}
    >
      {isGoogleAuth ? (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">
            <Info />
          </span>
          <p className="text-[13px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            You signed in with Google, so there&apos;s no password to confirm
            here. You can set your transaction PIN anytime from{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              Settings → Security
            </span>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="New PIN" htmlFor="pin">
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => {
                  setPin(onlyDigits(e.target.value));
                  if (error) setError('');
                }}
                placeholder="••••"
                className="h-12 rounded-xl text-center tracking-[0.5em]"
              />
            </FormField>
            <FormField label="Confirm PIN" htmlFor="confirm-pin">
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(onlyDigits(e.target.value));
                  if (error) setError('');
                }}
                placeholder="••••"
                className="h-12 rounded-xl text-center tracking-[0.5em]"
              />
            </FormField>
          </div>

          <FormField
            label="Account password"
            htmlFor="pin-password"
            hint="Confirm it's you before we save your PIN."
            error={error}
          >
            <Input
              id="pin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Your portal password"
              className="h-12 rounded-xl"
            />
          </FormField>
        </>
      )}
    </StepFrame>
  );
};

export default PinStep;
