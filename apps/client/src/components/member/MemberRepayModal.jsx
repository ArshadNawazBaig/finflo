import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormField from '@/components/ui/FormField';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Loader2,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowDownCircle,
  Calendar,
  HandCoins,
  Globe,
} from 'lucide-react';
import { formatCurrency, cn, capitalize } from '@/lib/utils';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';

const MemberRepayModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState(null);
  const [memberBalance, setMemberBalance] = useState(0);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [isSettlement, setIsSettlement] = useState(false);
  const [lastPaymentDate, setLastPaymentDate] = useState(null);
  const [truePrincipalPaid, setTruePrincipalPaid] = useState(0);
  const [isFetchingLastPayment, setIsFetchingLastPayment] = useState(false);
  const [formData, setFormData] = useState({
    notes: '',
  });
  const [showTxnConfirm, setShowTxnConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');

  const businessName = member?.user?.businessName || 'FinFlo';

  useEffect(() => {
    if (isOpen) {
      fetchMemberBalance();
      // Reset form when opened
      setIsSettlement(false);
      setFormData({
        amount: '',
        notes: `Self-repayment via ${businessName}`,
      });
    }
  }, [isOpen, businessName]);

  useEffect(() => {
    if (isOpen && loan?._id) {
      const fetchLastPayment = async () => {
        setIsFetchingLastPayment(true);
        try {
          // Fetch full member repayments to sum up true principal paid
          const { data } = await api.get(
            `/repayments/my-repayments?loanId=${loan._id}`,
          );
          const repayments = data?.data || [];

          if (repayments.length > 0) {
            setLastPaymentDate(new Date(repayments[0].date));
          } else {
            setLastPaymentDate(new Date(loan.startDate));
          }

          const calculatedPrincipalPaid = repayments.reduce(
            (sum, rp) => sum + (rp.principalAmount || 0),
            0,
          );
          setTruePrincipalPaid(calculatedPrincipalPaid);
        } catch (error) {
          // Fallback to loan start date
          setLastPaymentDate(new Date(loan.startDate));
          setTruePrincipalPaid(0);
        } finally {
          setIsFetchingLastPayment(false);
        }
      };
      fetchLastPayment();
    }
  }, [isOpen, loan]);

  const fetchMemberBalance = async () => {
    try {
      setFetchingBalance(true);
      const memberToken = localStorage.getItem('member');
      // Fix: Use correct member profile endpoint
      const { data } = await api.get('/member-auth/me', {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      setMember(data);
      setMemberBalance(data.currentBalance || 0);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setFetchingBalance(false);
    }
  };

  const getDailyInstallmentDetails = () => {
    const refDate = lastPaymentDate || new Date(loan.startDate);
    const now = new Date();
    let diff = now.getTime() - refDate.getTime();
    if (diff < 0) diff = 0;
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));

    let interestForDays = 0;
    let principalPerInstallment = 0;

    if (loan.interestType === 'simple' || !loan.interestType) {
      const monthlyInterest = (loan.principal * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      interestForDays = Math.round(dailyInterest * daysPassed);
      principalPerInstallment = Math.round(
        loan.principal / (loan.duration || 1),
      );
    } else if (loan.interestType === 'compound') {
      // Compound: interest on current remaining balance (grows on missed payments)
      const monthlyInterest = (loan.remainingAmount * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      interestForDays = Math.round(dailyInterest * daysPassed);
      principalPerInstallment = Math.round(
        loan.principal / (loan.duration || 1),
      );
    } else {
      // EMI Math
      const currentPrincipal = Math.max(0, loan.principal - truePrincipalPaid);
      const monthlyRate = loan.rate / 12 / 100;
      const dailyInterest = (currentPrincipal * monthlyRate) / 30;
      interestForDays = Math.round(dailyInterest * daysPassed);

      const standardMonthlyInterest = Math.round(
        currentPrincipal * monthlyRate,
      );
      principalPerInstallment = Math.round(loan.emi - standardMonthlyInterest);
      principalPerInstallment = Math.max(0, principalPerInstallment);
    }

    const adjustedAmount = principalPerInstallment + interestForDays;

    return { daysPassed, interestForDays, adjustedAmount };
  };

  const dailyInstallment = loan ? getDailyInstallmentDetails() : null;

  const getSettlementDetails = () => {
    if (!loan)
      return { amount: 0, daysElapsed: 0, interest: 0, isEarly: false };

    const start = new Date(loan.startDate);
    const now = new Date();

    let diffTimeTotal = now.getTime() - start.getTime();
    if (diffTimeTotal < 0) diffTimeTotal = 0;
    const totalDaysPassed = Math.floor(diffTimeTotal / (1000 * 60 * 60 * 24));

    const totalExpectedDays = (loan.duration || 1) * 30;

    if (totalDaysPassed >= totalExpectedDays) {
      return {
        amount: loan.remainingAmount,
        daysElapsed: totalDaysPassed,
        interest: loan.totalAmount - loan.principal,
        isEarly: false,
      };
    }

    const monthlyInterest = (loan.principal * loan.rate) / 1200;
    const dailyInterest = monthlyInterest / 30;
    const interest = Math.round(dailyInterest * totalDaysPassed);

    const adjustedTotal = loan.principal + interest;

    return {
      amount: Math.round(Math.max(0, adjustedTotal - loan.paidAmount)),
      daysElapsed: totalDaysPassed,
      interest,
      isEarly: true,
    };
  };

  const details = getSettlementDetails();
  const settlementAmount = details.amount;

  const handleSettlementToggle = (checked) => {
    setIsSettlement(checked);
    if (checked) {
      setFormData({ ...formData, amount: settlementAmount.toString() });
    } else {
      setFormData({ ...formData, amount: '' });
    }
  };

  if (!loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paymentAmount = Number(formData.amount);

    if (paymentAmount > memberBalance) {
      toast.error('Insufficient balance to make this repayment');
      return;
    }
    setShowTxnConfirm(true);
  };

  const executeRepayment = async (token) => {
    const paymentAmount = Number(formData.amount);

    setLoading(true);
    try {
      const memberToken = localStorage.getItem('member');
      await api.post(
        `/repayments/member/${loan._id}/repay`,
        {
          amount: paymentAmount,
          isSettlement,
          notes: formData.notes,
          paymentMethod,
        },
        {
          headers: {
            ...(token ? { 'x-transaction-token': token } : {}),
          },
        },
      );

      toast.success(
        isSettlement
          ? 'Loan settled successfully! Your balance and loan status have been updated.'
          : 'Repayment successful! Your balance and loan has been updated.',
      );
      setShowTxnConfirm(false);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to process repayment',
      );
    } finally {
      setLoading(false);
    }
  };

  const isInvalid =
    !formData.amount ||
    Number(formData.amount) <= 0 ||
    Number(formData.amount) >
      (isSettlement ? settlementAmount : loan.remainingAmount) + 1;
  const isInsufficient = Number(formData.amount) > memberBalance;

  return (
    <>
      <Dialog open={isOpen && !showTxnConfirm} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="flex-row items-start gap-3 space-y-0">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <Wallet />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400 mb-1.5">
                {isSettlement ? 'Early settlement' : 'Loan repayment'}
              </p>
              <DialogTitle>
                {isSettlement ? 'Early Settlement' : 'Repay Loan'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isSettlement
                  ? 'Pay off your loan today with adjusted interest.'
                  : `Select an amount to pay from your ${businessName} Balance.`}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Balance & Loan Info Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">
                Available
              </p>
              <p className="text-sm font-extrabold tracking-tight tabular-nums text-primary truncate">
                {fetchingBalance ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : (
                  formatCurrency(memberBalance)
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">
                {isSettlement ? 'Settlement' : 'Outstanding'}
              </p>
              <p
                className={cn(
                  'text-sm font-extrabold tracking-tight tabular-nums truncate',
                  isSettlement
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-rose-600 dark:text-rose-400',
                )}
              >
                {formatCurrency(
                  isSettlement ? settlementAmount : loan.remainingAmount,
                )}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Option: Monthly Installment */}
            {loan.emi > 0 && !isSettlement && dailyInstallment && (
              <div
                onClick={() =>
                  !isFetchingLastPayment &&
                  setFormData({
                    ...formData,
                    amount: dailyInstallment.adjustedAmount.toString(),
                  })
                }
                className={cn(
                  'rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex items-center justify-between group',
                  Number(formData.amount) === dailyInstallment.adjustedAmount
                    ? 'bg-primary/5 border-primary/40'
                    : 'bg-slate-50/40 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] hover:border-primary/30',
                  isFetchingLastPayment && 'opacity-60 pointer-events-none',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5 transition-colors',
                      Number(formData.amount) ===
                        dailyInstallment.adjustedAmount
                        ? 'bg-primary/10 text-primary'
                        : 'bg-white dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 group-hover:text-primary',
                    )}
                  >
                    {isFetchingLastPayment ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Calendar />
                    )}
                  </div>
                  <div className="space-y-0.5 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        Monthly Installment
                      </p>
                      {!isFetchingLastPayment && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary">
                          {dailyInstallment.daysPassed}d
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                        {isFetchingLastPayment
                          ? '...'
                          : formatCurrency(dailyInstallment.adjustedAmount)}
                      </p>
                      {!isFetchingLastPayment && (
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          incl.{' '}
                          {formatCurrency(dailyInstallment.interestForDays)}{' '}
                          interest
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {Number(formData.amount) ===
                  dailyInstallment.adjustedAmount && (
                  <CheckCircle2 size={18} className="text-primary" />
                )}
              </div>
            )}

            {/* Settlement Toggle Block */}
            <div
              className={cn(
                'rounded-2xl border p-4 transition-all duration-300',
                isSettlement
                  ? 'bg-blue-500/5 border-blue-500/20'
                  : 'bg-slate-50/40 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="m-isSettlement"
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer"
                  >
                    Early Settlement
                  </Label>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Interest recalculation to close loan
                  </p>
                </div>
                <input
                  id="m-isSettlement"
                  type="checkbox"
                  checked={isSettlement}
                  onChange={(e) => handleSettlementToggle(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-slate-200 dark:border-white/[0.1] text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
              </div>

              {isSettlement && (
                <div className="mt-4 p-3 bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/[0.06] space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Annual Rate
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                      {loan.rate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Original Term
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                      {loan.duration} Months
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Days Active
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                      {details.daysElapsed} Days
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
                      Adjusted Interest
                    </span>
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                      + {formatCurrency(details.interest)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Payment Method
              </label>
              <div className="flex gap-2 p-1.5 bg-slate-50/40 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/[0.06]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:bg-emerald-500 hover:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white',
                  )}
                >
                  <HandCoins size={14} />
                  Cash
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    paymentMethod === 'online'
                      ? 'bg-blue-500 text-white shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)]'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white',
                  )}
                >
                  <Globe size={14} />
                  Online
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <FormField
                label="Payment Amount"
                htmlFor="m-amount"
                labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                <div className="relative group">
                  <div
                    className={cn(
                      'absolute left-4 top-1/2 -translate-y-1/2 transition-transform group-focus-within:scale-110',
                      isSettlement
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-primary',
                    )}
                  >
                    <DollarSign size={18} strokeWidth={2.5} />
                  </div>
                  <Input
                    id="m-amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className={cn(
                      'h-14 pl-12 pr-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-lg font-extrabold tracking-tight tabular-nums focus:outline-none focus:ring-2 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600',
                      isSettlement
                        ? 'focus:ring-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'focus:ring-primary/20',
                    )}
                    max={
                      isSettlement ? settlementAmount : loan.remainingAmount
                    }
                    required
                  />
                </div>
              </FormField>

              {isInsufficient && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 flex items-center gap-3">
                  <AlertTriangle
                    className="text-rose-500 shrink-0"
                    size={16}
                  />
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Sufficient balance not available.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                disabled={isInvalid || isInsufficient}
                className={cn(
                  'h-11 px-7 rounded-full font-bold text-sm text-white transition-all duration-300 hover:-translate-y-0.5',
                  isSettlement
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)]'
                    : 'bg-primary hover:bg-primary/90 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]',
                )}
              >
                <span className="flex items-center gap-2">
                  {isSettlement ? (
                    <ArrowDownCircle size={16} strokeWidth={2.5} />
                  ) : (
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                  )}
                  {isSettlement ? 'Settle Now' : 'Pay Back'}
                </span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Confirmation */}
      <TransactionConfirmModal
        isOpen={showTxnConfirm}
        onClose={() => setShowTxnConfirm(false)}
        onConfirm={executeRepayment}
        loading={loading}
        type="loan-payment"
        amount={Number(formData.amount) || 0}
        details={[
          {
            label: 'Loan',
            value: `#${loan?.loanNumber || loan?._id?.slice(-6) || ''}`,
          },
          {
            label: 'Type',
            value: isSettlement ? 'Full Settlement' : 'Installment',
          },
          {
            label: 'Method',
            value: paymentMethod === 'cash' ? 'Cash' : 'Online',
          },
          {
            label: 'Outstanding',
            value: formatCurrency(loan?.remainingAmount || 0),
          },
        ]}
        description={formData.notes || undefined}
      />
    </>
  );
};

export default MemberRepayModal;
