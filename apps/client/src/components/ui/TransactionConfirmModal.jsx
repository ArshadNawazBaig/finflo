import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  HandCoins,
  Send,
  Loader2,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';

const TransactionConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  type = 'custom',
  title,
  amount,
  details = [],
  description,
  confirmText,
  requirePin: requirePinProp = true,
  transactionToken: existingToken,
  isAdminTransaction = false,
}) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinStatus, setPinStatus] = useState(null);
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmNewPin, setConfirmNewPin] = useState(['', '', '', '']);
  const [setupStep, setSetupStep] = useState(1);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const newPinRefs = [useRef(), useRef(), useRef(), useRef()];
  const confirmNewPinRefs = [useRef(), useRef(), useRef(), useRef()];
  const failedAttempts = useRef(0);

  const needsPin = requirePinProp && !isAdminTransaction && !existingToken;

  useEffect(() => {
    if (isOpen && needsPin) {
      setPin(['', '', '', '']);
      setPinError('');
      setShowSetPin(false);
      failedAttempts.current = 0;
      const checkStatus = async () => {
        try {
          const { data } = await api.get('/members/portal/pin-status');
          setPinStatus(data);
          if (!data.hasPin && !data.hasPinSet) {
            setShowSetPin(true);
            setSetupStep(1);
            setNewPin(['', '', '', '']);
            setConfirmNewPin(['', '', '', '']);
            setSetupPassword('');
            setSetupError('');
          }
        } catch {
          setPinStatus({ hasPin: false });
          setShowSetPin(true);
        }
      };
      checkStatus();
    } else if (isOpen) {
      setPinStatus({ hasPin: true });
    }
  }, [isOpen, needsPin]);

  useEffect(() => {
    if (isOpen && needsPin && pinStatus?.hasPin && !showSetPin) {
      setTimeout(() => pinRefs[0].current?.focus(), 200);
    }
  }, [isOpen, pinStatus, showSetPin]);

  const handlePinChange = (index, value, refs, setter, state) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...state];
    next[index] = value.slice(-1);
    setter(next);
    if (value && index < 3) refs[index + 1].current?.focus();
  };

  const handlePinKeyDown = (index, e, refs, setter, state) => {
    if (e.key === 'Backspace' && !state[index] && index > 0) {
      refs[index - 1].current?.focus();
      const next = [...state];
      next[index - 1] = '';
      setter(next);
    }
  };

  const handleConfirm = async () => {
    if (needsPin && pinStatus?.hasPin && !showSetPin) {
      const pinStr = pin.join('');
      if (pinStr.length !== 4) {
        setPinError('Enter your 4-digit PIN');
        return;
      }

      setPinLoading(true);
      setPinError('');
      try {
        const { data } = await api.post('/members/portal/verify-pin', { pin: pinStr });
        await onConfirm(data.token);
      } catch (err) {
        if (err.response?.status === 422 || err.response?.status === 423) {
          failedAttempts.current += 1;
          const remaining = 3 - failedAttempts.current;

          if (remaining <= 0) {
            toast.error('Too many wrong attempts — session ended for security.');
            localStorage.removeItem('member');
            setTimeout(() => {
              window.location.href = '/member/login';
            }, 800);
            return;
          }

          setPinError(`Incorrect PIN (${remaining} attempt${remaining > 1 ? 's' : ''} left)`);
          setPin(['', '', '', '']);
          setTimeout(() => pinRefs[0].current?.focus(), 100);
        }
      } finally {
        setPinLoading(false);
      }
    } else {
      await onConfirm(existingToken);
    }
  };

  const handleSetPinNext = () => {
    if (setupStep === 1) {
      if (newPin.some((d) => !d)) return;
      setSetupStep(2);
      setConfirmNewPin(['', '', '', '']);
      setTimeout(() => confirmNewPinRefs[0].current?.focus(), 100);
    } else if (setupStep === 2) {
      if (newPin.join('') !== confirmNewPin.join('')) {
        setSetupError('PINs do not match');
        setConfirmNewPin(['', '', '', '']);
        setTimeout(() => confirmNewPinRefs[0].current?.focus(), 100);
        return;
      }
      setSetupError('');
      setSetupStep(3);
    }
  };

  useEffect(() => {
    if (showSetPin && setupStep === 1 && newPin.every((d) => d !== '')) handleSetPinNext();
  }, [newPin, setupStep, showSetPin]);

  useEffect(() => {
    if (showSetPin && setupStep === 2 && confirmNewPin.every((d) => d !== '')) handleSetPinNext();
  }, [confirmNewPin, setupStep, showSetPin]);

  const handleSetPinSubmit = async () => {
    if (!setupPassword) {
      setSetupError('Password is required');
      return;
    }
    setSetupLoading(true);
    setSetupError('');
    try {
      await api.post('/members/portal/set-pin', {
        pin: newPin.join(''),
        currentPassword: setupPassword,
      });
      toast.success('Transaction PIN set!');
      setPinStatus({ hasPin: true, hasPinSet: true });
      setShowSetPin(false);
      setPin(['', '', '', '']);
      setTimeout(() => pinRefs[0].current?.focus(), 200);
    } catch (err) {
      setSetupError(err.response?.data?.message || 'Failed to set PIN');
    } finally {
      setSetupLoading(false);
    }
  };

  const renderPinInputs = (values, refs, setter, small = false) => (
    <div className="flex gap-2 justify-center">
      {values.map((digit, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handlePinChange(i, e.target.value, refs, setter, values)}
          onKeyDown={(e) => handlePinKeyDown(i, e, refs, setter, values)}
          className={cn(
            'text-center font-extrabold rounded-2xl border bg-white dark:bg-white/[0.02] transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
            small ? 'w-11 h-12 text-lg' : 'w-12 h-14 text-xl',
            digit
              ? 'border-primary/40'
              : 'border-slate-100 dark:border-white/[0.06]',
          )}
        />
      ))}
    </div>
  );

  const typeConfig = {
    credit: {
      icon: <ArrowDownCircle size={16} strokeWidth={2.5} />,
      chipTone: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
      eyebrowTone: 'text-emerald-500 dark:text-emerald-400',
      amountColor: 'text-emerald-600 dark:text-emerald-400',
      btnClass:
        'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]',
      defaultTitle: 'Confirm Deposit',
      defaultConfirm: 'Confirm Deposit',
      badgeText: 'Credit transaction',
    },
    debit: {
      icon: <ArrowUpCircle size={16} strokeWidth={2.5} />,
      chipTone: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
      eyebrowTone: 'text-rose-500 dark:text-rose-400',
      amountColor: 'text-rose-600 dark:text-rose-400',
      btnClass:
        'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,0.5)]',
      defaultTitle: 'Confirm Withdrawal',
      defaultConfirm: 'Confirm Withdrawal',
      badgeText: 'Debit transaction',
    },
    transfer: {
      icon: <Send size={16} strokeWidth={2.5} />,
      chipTone: 'bg-primary/10 text-primary',
      eyebrowTone: 'text-primary',
      amountColor: 'text-primary',
      btnClass:
        'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]',
      defaultTitle: 'Confirm Transfer',
      defaultConfirm: 'Confirm Transfer',
      badgeText: 'Fund transfer',
    },
    'loan-payment': {
      icon: <Banknote size={16} strokeWidth={2.5} />,
      chipTone: 'bg-primary/10 text-primary',
      eyebrowTone: 'text-primary',
      amountColor: 'text-primary',
      btnClass:
        'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]',
      defaultTitle: 'Confirm Loan Payment',
      defaultConfirm: 'Confirm Payment',
      badgeText: 'Loan repayment',
    },
    'cash-opening': {
      icon: <HandCoins size={16} strokeWidth={2.5} />,
      chipTone: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
      eyebrowTone: 'text-emerald-500 dark:text-emerald-400',
      amountColor: 'text-emerald-600 dark:text-emerald-400',
      btnClass:
        'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]',
      defaultTitle: 'Set Cash in Hand',
      defaultConfirm: 'Confirm',
      badgeText: 'Cash opening',
    },
    custom: {
      icon: <AlertTriangle size={16} strokeWidth={2.5} />,
      chipTone: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
      eyebrowTone: 'text-amber-500 dark:text-amber-400',
      amountColor: 'text-amber-600 dark:text-amber-400',
      btnClass:
        'bg-amber-500 hover:bg-amber-600 text-white shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)]',
      defaultTitle: 'Confirm Transaction',
      defaultConfirm: 'Confirm',
      badgeText: 'Transaction',
    },
  };

  const config = typeConfig[type] || typeConfig.custom;
  const modalTitle = title || config.defaultTitle;
  const btnText = confirmText || config.defaultConfirm;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] !p-0 !gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
              config.chipTone,
            )}
          >
            {config.icon}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p
              className={cn(
                'text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5',
                config.eyebrowTone,
              )}
            >
              {config.badgeText}
            </p>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription className="mt-1">
              Please review and confirm
            </DialogDescription>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 sm:px-7 pb-6 space-y-4">
          {/* Amount Display */}
          {amount !== undefined && amount !== null && (
            <div className="text-center py-5 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1.5">
                Transaction amount
              </p>
              <p
                className={cn(
                  'text-3xl font-extrabold tracking-tight tabular-nums',
                  config.amountColor,
                )}
              >
                {formatCurrency(amount)}
              </p>
            </div>
          )}

          {/* Transaction Details */}
          {details.length > 0 && (
            <div className="rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-4 space-y-2.5">
              {details.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    {item.label}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[60%] text-right tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Note
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>
          )}

          {/* PIN Entry Section */}
          {needsPin && (
            <div className="border-t border-slate-100 dark:border-white/[0.06] pt-4 space-y-3">
              {pinStatus === null ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : showSetPin ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                    <ShieldAlert size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 leading-relaxed">
                      A transaction PIN is required to authorize transfers, withdrawals, and repayments. Please set up your PIN to continue.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 justify-center">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      {setupStep === 1 && 'Create a 4-digit PIN'}
                      {setupStep === 2 && 'Confirm your PIN'}
                      {setupStep === 3 && 'Verify with password'}
                    </p>
                  </div>

                  {setupStep === 1 && (
                    <>
                      {renderPinInputs(newPin, newPinRefs, setNewPin, true)}
                      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                        This PIN secures all your transactions
                      </p>
                    </>
                  )}

                  {setupStep === 2 && (
                    <>
                      {renderPinInputs(confirmNewPin, confirmNewPinRefs, setConfirmNewPin, true)}
                      {setupError && (
                        <p className="text-[10px] text-center text-rose-500 font-bold">
                          {setupError}
                        </p>
                      )}
                    </>
                  )}

                  {setupStep === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 justify-center">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          PIN confirmed: ● ● ● ●
                        </p>
                      </div>
                      <input
                        type="password"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Enter your login password"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSetPinSubmit();
                        }}
                      />
                      {setupError && (
                        <p className="text-[10px] text-center text-rose-500 font-bold">
                          {setupError}
                        </p>
                      )}
                      <Button
                        onClick={handleSetPinSubmit}
                        isLoading={setupLoading}
                        disabled={!setupPassword}
                        className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]"
                      >
                        Set PIN & Continue
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 justify-center">
                    <Fingerprint size={14} className="text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Enter transaction PIN
                    </p>
                  </div>
                  {renderPinInputs(pin, pinRefs, setPin, true)}
                  {pinError && (
                    <p className="text-[10px] text-center text-rose-500 font-bold animate-in fade-in">
                      {pinError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(!needsPin || !showSetPin || setupStep < 3) && !(showSetPin && setupStep === 3) && (
          <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              onClick={onClose}
              disabled={loading || pinLoading}
              className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              onClick={handleConfirm}
              disabled={loading || pinLoading || (needsPin && showSetPin)}
              className={cn(
                'h-11 px-7 rounded-full font-bold text-sm transition-all hover:-translate-y-0.5',
                config.btnClass,
              )}
            >
              {loading || pinLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {needsPin && <Fingerprint size={14} />}
                  {btnText}
                </span>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionConfirmModal;
