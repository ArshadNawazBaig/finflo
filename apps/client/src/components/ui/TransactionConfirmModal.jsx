import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Banknote, HandCoins, Send, Loader2, Fingerprint, ShieldCheck } from 'lucide-react';
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

/**
 * TransactionConfirmModal — Reusable confirmation dialog for financial transactions.
 * Now includes inline Transaction PIN verification.
 *
 * Props:
 *   isOpen       — boolean, controls visibility
 *   onClose      — function, close handler
 *   onConfirm    — function(transactionToken), execute the transaction (receives token)
 *   loading      — boolean, shows spinner on confirm button
 *   type         — 'credit' | 'debit' | 'transfer' | 'loan-payment' | 'cash-opening' | 'custom'
 *   title        — string, modal heading (auto-inferred from type if omitted)
 *   amount       — number, the transaction amount
 *   details      — array of { label, value } to display as summary rows
 *   description  — string, optional note/description
 *   confirmText  — string, confirm button label (defaults based on type)
 *   requirePin   — boolean, if true shows PIN entry (default: true for member transactions)
 *   transactionToken — string, if already have a valid token skip PIN entry
 *   isAdminTransaction — boolean, skip PIN for admin-initiated transactions
 */
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
  const [pinStatus, setPinStatus] = useState(null); // null = loading, { hasPin }
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmNewPin, setConfirmNewPin] = useState(['', '', '', '']);
  const [setupStep, setSetupStep] = useState(1); // 1: create, 2: confirm, 3: password
  const [setupPassword, setSetupPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const newPinRefs = [useRef(), useRef(), useRef(), useRef()];
  const confirmNewPinRefs = [useRef(), useRef(), useRef(), useRef()];
  const failedAttempts = useRef(0);

  const needsPin = requirePinProp && !isAdminTransaction && !existingToken;

  // Check PIN status on open
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
      setPinStatus({ hasPin: true }); // Admin or already have token
    }
  }, [isOpen, needsPin]);

  // Auto-focus first PIN input
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

  // Handle confirm: verify PIN → get token → call onConfirm with token
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
        // PIN verified — call onConfirm with token and await it
        await onConfirm(data.token);
      } catch (err) {
        // Wrong PIN (422) or locked (423)
        if (err.response?.status === 422 || err.response?.status === 423) {
          failedAttempts.current += 1;
          const remaining = 3 - failedAttempts.current;

          if (remaining <= 0) {
            // 3 failed attempts → logout
            toast.error('Too many wrong attempts — session ended for security.');
            localStorage.removeItem('member');
            setTimeout(() => {
              window.location.href = '/member/login';
            }, 800);
            return;
          }

          // Still have attempts left
          setPinError(`Incorrect PIN (${remaining} attempt${remaining > 1 ? 's' : ''} left)`);
          setPin(['', '', '', '']);
          setTimeout(() => pinRefs[0].current?.focus(), 100);
        }
      } finally {
        setPinLoading(false);
      }
    } else {
      // No PIN required or already have token
      await onConfirm(existingToken);
    }
  };

  // Set PIN flow
  const handleSetPinNext = () => {
    if (setupStep === 1) {
      if (newPin.some(d => !d)) return;
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
    if (showSetPin && setupStep === 1 && newPin.every(d => d !== '')) handleSetPinNext();
  }, [newPin, setupStep, showSetPin]);

  useEffect(() => {
    if (showSetPin && setupStep === 2 && confirmNewPin.every(d => d !== '')) handleSetPinNext();
  }, [confirmNewPin, setupStep, showSetPin]);

  const handleSetPinSubmit = async () => {
    if (!setupPassword) { setSetupError('Password is required'); return; }
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
            'text-center font-black rounded-xl border-2 bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/30',
            small ? 'w-10 h-11 text-lg' : 'w-12 h-14 text-xl',
            digit ? 'border-primary/40' : 'border-border/50',
          )}
        />
      ))}
    </div>
  );

  const typeConfig = {
    credit: {
      icon: <ArrowDownCircle className="w-6 h-6" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      amountColor: 'text-emerald-600',
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
      defaultTitle: 'Confirm Deposit',
      defaultConfirm: 'Confirm Deposit',
      badgeText: 'Credit Transaction',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    debit: {
      icon: <ArrowUpCircle className="w-6 h-6" />,
      iconBg: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
      amountColor: 'text-rose-600',
      btnClass: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
      defaultTitle: 'Confirm Withdrawal',
      defaultConfirm: 'Confirm Withdrawal',
      badgeText: 'Debit Transaction',
      badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    },
    transfer: {
      icon: <Send className="w-6 h-6" />,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      amountColor: 'text-indigo-600',
      btnClass: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20',
      defaultTitle: 'Confirm Transfer',
      defaultConfirm: 'Confirm Transfer',
      badgeText: 'Fund Transfer',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    },
    'loan-payment': {
      icon: <Banknote className="w-6 h-6" />,
      iconBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
      amountColor: 'text-indigo-600',
      btnClass: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20',
      defaultTitle: 'Confirm Loan Payment',
      defaultConfirm: 'Confirm Payment',
      badgeText: 'Loan Repayment',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    },
    'cash-opening': {
      icon: <HandCoins className="w-6 h-6" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      amountColor: 'text-emerald-600',
      btnClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
      defaultTitle: 'Set Cash in Hand',
      defaultConfirm: 'Confirm',
      badgeText: 'Cash Opening',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    custom: {
      icon: <AlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      amountColor: 'text-amber-600',
      btnClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      defaultTitle: 'Confirm Transaction',
      defaultConfirm: 'Confirm',
      badgeText: 'Transaction',
      badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
  };

  const config = typeConfig[type] || typeConfig.custom;
  const modalTitle = title || config.defaultTitle;
  const btnText = confirmText || config.defaultConfirm;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-card border-border/50 rounded-3xl">
        {/* Header */}
        <div className={cn('relative p-6 pb-4 bg-gradient-to-br border-b border-border/50', config.gradient)}>
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border', config.iconBg)}>
              {config.icon}
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {modalTitle}
              </DialogTitle>
              <DialogDescription className="text-[11px] font-bold text-muted-foreground/80 tracking-wide mt-1">
                Please review and confirm
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Amount Display */}
          {amount !== undefined && amount !== null && (
            <div className="text-center py-4 rounded-2xl bg-muted/30 border border-border/50">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                Transaction Amount
              </p>
              <p className={cn('text-3xl font-black tracking-tight', config.amountColor)}>
                {formatCurrency(amount)}
              </p>
            </div>
          )}

          {/* Transaction Details */}
          {details.length > 0 && (
            <div className="space-y-2 p-4 rounded-2xl bg-muted/20 border border-border/30">
              {details.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {item.label}
                  </span>
                  <span className="text-xs font-bold text-foreground truncate max-w-[55%] text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Note</p>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">{description}</p>
            </div>
          )}

          {/* ─── PIN Entry Section ─── */}
          {needsPin && (
            <div className="border-t border-border/30 pt-4 space-y-3">
              {pinStatus === null ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : showSetPin ? (
                /* ─── Inline Set PIN Flow ─── */
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 justify-center">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {setupStep === 1 && 'Create a 4-Digit PIN'}
                      {setupStep === 2 && 'Confirm Your PIN'}
                      {setupStep === 3 && 'Verify With Password'}
                    </p>
                  </div>

                  {setupStep === 1 && (
                    <>
                      {renderPinInputs(newPin, newPinRefs, setNewPin, true)}
                      <p className="text-[9px] text-center text-muted-foreground/60">
                        This PIN secures all your transactions
                      </p>
                    </>
                  )}

                  {setupStep === 2 && (
                    <>
                      {renderPinInputs(confirmNewPin, confirmNewPinRefs, setConfirmNewPin, true)}
                      {setupError && <p className="text-[10px] text-center text-red-500 font-bold">{setupError}</p>}
                    </>
                  )}

                  {setupStep === 3 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 justify-center">
                        <ShieldCheck size={14} className="text-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-600">PIN confirmed: ● ● ● ●</p>
                      </div>
                      <input
                        type="password"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Enter your login password"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSetPinSubmit(); }}
                      />
                      {setupError && <p className="text-[10px] text-center text-red-500 font-bold">{setupError}</p>}
                      <Button
                        onClick={handleSetPinSubmit}
                        isLoading={setupLoading}
                        disabled={!setupPassword}
                        className="w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-widest"
                      >
                        Set PIN & Continue
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* ─── PIN Verify Input ─── */
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 justify-center">
                    <Fingerprint size={16} className="text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Enter Transaction PIN
                    </p>
                  </div>
                  {renderPinInputs(pin, pinRefs, setPin, true)}
                  {pinError && (
                    <p className="text-[10px] text-center text-red-500 font-bold animate-in fade-in">{pinError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(!needsPin || !showSetPin || setupStep < 3) && !(showSetPin && setupStep === 3) && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading || pinLoading}
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading || pinLoading || (needsPin && showSetPin)}
                className={cn(
                  'flex-[2] h-12 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95',
                  config.btnClass,
                )}
              >
                {(loading || pinLoading) ? <Loader2 size={16} className="animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    {needsPin && <Fingerprint size={14} />}
                    {btnText}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionConfirmModal;
