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
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

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

    setLoading(true);
    try {
      const memberToken = localStorage.getItem('member');
      await api.post(
        `/repayments/member/${loan._id}/repay`,
        {
          amount: paymentAmount,
          isSettlement,
          notes: formData.notes,
        },
        {
          headers: {
            /* Auth header handled by browser cookies */
          },
        },
      );

      toast.success(
        isSettlement
          ? 'Loan settled successfully! Your balance and loan status have been updated.'
          : 'Repayment successful! Your balance and loan has been updated.',
      );
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] !p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                <Wallet className="w-8 h-8" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {isSettlement ? 'Early Settlement' : 'Repay Loan'}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  {isSettlement
                    ? 'Pay off your loan today with adjusted interest.'
                    : `Select an amount to pay from your ${businessName} Balance.`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Balance & Loan Info Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-3xl bg-card border border-border/40 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                Available
              </p>
              <p className="text-sm font-black text-primary truncate">
                {fetchingBalance ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : (
                  formatCurrency(memberBalance)
                )}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-card border border-border/40 shadow-sm text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                {isSettlement ? 'Settlement' : 'Outstanding'}
              </p>
              <p
                className={`text-sm font-black truncate ${isSettlement ? 'text-blue-600' : 'text-rose-600'}`}
              >
                {formatCurrency(
                  isSettlement ? settlementAmount : loan.remainingAmount,
                )}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  'p-4 rounded-3xl border cursor-pointer transition-all duration-300 flex items-center justify-between group',
                  Number(formData.amount) === dailyInstallment.adjustedAmount
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-muted/30 border-border/40 hover:border-primary/50',
                  isFetchingLastPayment && 'opacity-60 pointer-events-none',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-xl transition-colors',
                      Number(formData.amount) ===
                        dailyInstallment.adjustedAmount
                        ? 'bg-primary/20 text-primary'
                        : 'bg-background text-muted-foreground group-hover:text-primary',
                    )}
                  >
                    {isFetchingLastPayment ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Calendar size={16} />
                    )}
                  </div>
                  <div className="space-y-0.5 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Monthly Installment
                      </p>
                      {!isFetchingLastPayment && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {dailyInstallment.daysPassed}d
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-black text-foreground">
                        {isFetchingLastPayment
                          ? '...'
                          : formatCurrency(dailyInstallment.adjustedAmount)}
                      </p>
                      {!isFetchingLastPayment && (
                        <p className="text-[9px] font-bold text-muted-foreground">
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
                  <CheckCircle2 size={20} className="text-primary" />
                )}
              </div>
            )}

            {/* Settlement Toggle Block */}
            <div
              className={`p-4 rounded-3xl border transition-all duration-300 ${isSettlement ? 'bg-blue-500/10 border-blue-500/20' : 'bg-muted/40 border-border/40'}`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="m-isSettlement"
                    className="text-xs font-black uppercase tracking-widest cursor-pointer"
                  >
                    Early Settlement
                  </Label>
                  <p className="text-[10px] text-muted-foreground font-bold">
                    Interest recalculation to close loan
                  </p>
                </div>
                <input
                  id="m-isSettlement"
                  type="checkbox"
                  checked={isSettlement}
                  onChange={(e) => handleSettlementToggle(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-border/50 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                />
              </div>

              {isSettlement && (
                <div className="mt-4 p-3 bg-blue-500/5 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-blue-800/60">
                    <span>Annual Rate</span>
                    <span>{loan.rate}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-blue-800/60">
                    <span>Original Term</span>
                    <span>{loan.duration} Months</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-blue-800/60">
                    <span>Days Active</span>
                    <span>{details.daysElapsed} Days</span>
                  </div>
                  <div className="pt-2 border-t border-blue-500/20 flex justify-between text-[10px] font-black uppercase text-blue-600">
                    <span>Adjusted Interest</span>
                    <span>+ {formatCurrency(details.interest)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="m-amount"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                >
                  Payment Amount
                </Label>
                <div className="relative group">
                  <div
                    className={`absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:scale-110 transition-transform ${isSettlement ? 'text-blue-600' : 'text-primary'}`}
                  >
                    <DollarSign size={20} strokeWidth={3} />
                  </div>
                  <Input
                    id="m-amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className={`h-16 pl-14 pr-6 rounded-2xl border-none bg-muted/50 text-xl font-black focus:ring-2 transition-all placeholder:text-muted-foreground/30 ${isSettlement ? 'focus:ring-blue-500/20 text-blue-600' : 'focus:ring-primary/20'}`}
                    max={isSettlement ? settlementAmount : loan.remainingAmount}
                    required
                  />
                </div>
              </div>

              {isInsufficient && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="text-rose-600 shrink-0" size={18} />
                  <p className="text-xs font-bold text-rose-600">
                    Sufficient balance not available.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all active:scale-95"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={loading}
                disabled={isInvalid || isInsufficient}
                variant={isSettlement ? 'gradient' : 'gradient'}
                className={`flex-[2] h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 group overflow-hidden ${isSettlement ? 'shadow-blue-500/20' : 'shadow-primary/20'}`}
              >
                <div className="flex items-center gap-2">
                  {isSettlement ? (
                    <ArrowDownCircle size={18} strokeWidth={3} />
                  ) : (
                    <CheckCircle2 size={18} strokeWidth={3} />
                  )}
                  {isSettlement ? 'Settle Now' : 'Pay Back'}
                </div>
              </Button>
            </div>
          </form>

          <p className="mt-8 text-[9px] text-center text-muted-foreground/50 font-medium tracking-wide">
            TRANSACTION SECURED BY {businessName.toUpperCase()} 3D-PROTOCOL
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberRepayModal;
