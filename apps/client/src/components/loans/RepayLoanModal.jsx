import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  DollarSign,
  MessageSquare,
  ArrowDownCircle,
  Banknote,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, cn, capitalize } from '@/lib/utils';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';
import { Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

const RepayLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [memberBalance, setMemberBalance] = useState(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSettlement, setIsSettlement] = useState(false);
  const [lastPaymentDate, setLastPaymentDate] = useState(null);
  const [truePrincipalPaid, setTruePrincipalPaid] = useState(0);
  const [isFetchingLastPayment, setIsFetchingLastPayment] = useState(false);
  const [showTxnConfirm, setShowTxnConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const amount = watch('amount');
  const date = watch('date');

  useEffect(() => {
    if (isOpen && loan?.customer?.isMember && loan?.customer?.memberId) {
      const fetchMemberBalance = async () => {
        setIsFetchingBalance(true);
        try {
          const { data } = await api.get(`/members/${loan.customer.memberId}`);
          setMemberBalance(data.currentBalance || 0);
        } catch (error) {
          console.error('Failed to fetch member balance', error);
        } finally {
          setIsFetchingBalance(false);
        }
      };
      fetchMemberBalance();
    } else {
      setMemberBalance(null);
    }
  }, [isOpen, loan]);

  useEffect(() => {
    if (isOpen && loan?._id) {
      const fetchLastPayment = async () => {
        setIsFetchingLastPayment(true);
        try {
          // Fetch full repayments history to calculate true accumulated principal
          const { data } = await api.get(
            `/repayments?loanId=${loan._id}&sortBy=date&sortOrder=desc`,
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

  if (!loan) return null;

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

  const dailyInstallment = getDailyInstallmentDetails();

  // Calculate settlement amount preview
  const getSettlementDetails = () => {
    if (!loan)
      return { amount: 0, daysElapsed: 0, interest: 0, isEarly: false };

    const start = new Date(loan.startDate);
    const now = new Date(date || new Date());
    let diffTimeTotal = now.getTime() - start.getTime();
    if (diffTimeTotal < 0) diffTimeTotal = 0;
    const totalDaysPassed = Math.floor(diffTimeTotal / (1000 * 60 * 60 * 24));

    // Safety fallback
    const expectedDays = (loan.duration || 1) * 30;
    if (totalDaysPassed >= expectedDays) {
      return {
        amount: loan.remainingAmount,
        daysElapsed: totalDaysPassed,
        interest: loan.totalAmount - loan.principal,
        isEarly: false,
      };
    }

    if (loan.interestType === 'simple' || !loan.interestType) {
      const monthlyInterest = (loan.principal * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      const totalAccruedInterest = Math.round(dailyInterest * totalDaysPassed);

      const adjustedTotal = loan.principal + totalAccruedInterest;
      return {
        amount: Math.round(Math.max(0, adjustedTotal - loan.paidAmount)),
        daysElapsed: totalDaysPassed,
        interest: totalAccruedInterest,
        isEarly: true,
      };
    } else if (loan.interestType === 'compound') {
      // Compound: remainingAmount already includes compounded interest from cron
      return {
        amount: loan.remainingAmount,
        daysElapsed: totalDaysPassed,
        interest: loan.compoundedAmount || 0,
        isEarly: totalDaysPassed < expectedDays,
      };
    } else {
      // EMI Math: Final settlement is current principal + just the current period's interest
      const currentPrincipal = Math.max(0, loan.principal - truePrincipalPaid);

      const refDate = lastPaymentDate || new Date(loan.startDate);
      let diffDaysSinceLast = now.getTime() - refDate.getTime();
      if (diffDaysSinceLast < 0) diffDaysSinceLast = 0;
      const daysPassedSinceLast = Math.floor(
        diffDaysSinceLast / (1000 * 60 * 60 * 24),
      );

      const monthlyRate = loan.rate / 12 / 100;
      const dailyInterest = (currentPrincipal * monthlyRate) / 30;
      const interestForCurrentPeriod = Math.round(
        dailyInterest * daysPassedSinceLast,
      );

      return {
        amount: Math.round(currentPrincipal + interestForCurrentPeriod),
        daysElapsed: totalDaysPassed,
        interest: interestForCurrentPeriod,
        isEarly: true,
      };
    }
  };

  const details = getSettlementDetails();
  const settlementAmount = details.amount;

  const handleSettlementToggle = (checked) => {
    setIsSettlement(checked);
    if (checked) {
      setValue('amount', settlementAmount.toString());
    } else {
      setValue('amount', '');
    }
  };

  const onSubmit = async (formData) => {
    setPendingFormData(formData);
    setShowTxnConfirm(true);
  };

  const executeRepayment = async () => {
    setShowTxnConfirm(false);
    const formData = pendingFormData;
    if (!formData) return;
    setLoading(true);
    try {
      const selectedDateString = formData.date;
      const now = new Date();
      let isoDate = selectedDateString;
      
      if (selectedDateString && !selectedDateString.includes('T')) {
        const d = new Date(selectedDateString);
        d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        isoDate = d.toISOString();
      }

      await api.post('/repayments', {
        loanId: loan._id,
        amount: Number(formData.amount),
        date: isoDate,
        notes: formData.notes,
        isSettlement,
      });

      toast.success(
        isSettlement
          ? 'Loan settled successfully'
          : 'Repayment recorded successfully',
      );
      onSuccess();
      onClose();
      reset({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setIsSettlement(false);
      setPendingFormData(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to record repayment',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen && !showTxnConfirm} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[95vh] !p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-2 p-0 sm:p-0">
              <div className="p-2 sm:p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-2xl font-black">
                  {isSettlement ? 'Early Loan Settlement' : 'Pay Back Loan'}
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-sm font-medium">
                  {isSettlement
                    ? 'Calculate interest up to today and close the loan'
                    : `Submit a new installment for ${loan.customer?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Settlement Info Card */}
          <div
            className={`mx-0 sm:mx-0 rounded-[1.25rem] sm:rounded-[1.5rem] p-3 sm:p-4 mb-4 border transition-colors ${
              isSettlement
                ? 'bg-blue-500/5 border-blue-500/20'
                : 'bg-emerald-500/5 border-emerald-500/10'
            }`}
          >
            <div className="flex items-center justify-between mb-3 last:mb-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`p-1.5 sm:p-2 rounded-xl ${
                    isSettlement
                      ? 'bg-blue-500/20 text-blue-600'
                      : 'bg-emerald-500/20 text-emerald-600'
                  }`}
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                    isSettlement ? 'text-blue-700/70' : 'text-emerald-700/70'
                  }`}
                >
                  {isSettlement ? 'Settlement Amount' : 'Outstanding'}
                </span>
              </div>
              <span
                className={`text-base sm:text-lg font-black ${
                  isSettlement ? 'text-blue-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(
                  isSettlement ? settlementAmount : loan.remainingAmount,
                )}
              </span>
            </div>

            {isSettlement && (
              <div className="p-3 bg-blue-500/10 rounded-xl space-y-2">
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
                <div className="pt-1 border-t border-blue-500/20 flex justify-between text-[10px] font-black uppercase text-blue-600">
                  <span>Adjusted Interest</span>
                  <span>{formatCurrency(details.interest)}</span>
                </div>
              </div>
            )}

            {/* Member Balance Alert */}
            {memberBalance !== null && (
              <div
                className={cn(
                  'mt-3 p-3 rounded-xl border flex gap-3 transition-colors',
                  Number(amount) > memberBalance
                    ? 'bg-red-500/10 border-red-500/20 text-red-600'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
                )}
              >
                <Wallet className="w-5 h-5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    Available Member Balance
                  </p>
                  <p className="text-lg font-black tracking-tight">
                    {isFetchingBalance ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      formatCurrency(memberBalance)
                    )}
                  </p>
                  {Number(amount) > memberBalance && !isFetchingBalance && (
                    <p className="text-[10px] font-black text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} /> Exceeds available funds
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <form
            id="repay-loan-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 sm:space-y-6 p-0 sm:px-0 sm:pb-0"
          >
            <div className="space-y-4 sm:space-y-5">
              {/* Quick Option: Monthly Installment */}
              {loan.emi > 0 && !isSettlement && (
                <div
                  onClick={() =>
                    !isFetchingLastPayment &&
                    setValue(
                      'amount',
                      dailyInstallment.adjustedAmount.toString(),
                    )
                  }
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between group',
                    Number(amount) === dailyInstallment.adjustedAmount
                      ? 'bg-emerald-500/5 border-emerald-500/20 shadow-sm'
                      : 'bg-muted/30 border-border/50 hover:border-emerald-500/30',
                    isFetchingLastPayment && 'opacity-60 pointer-events-none',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-xl transition-colors',
                        Number(amount) === dailyInstallment.adjustedAmount
                          ? 'bg-emerald-500/20 text-emerald-600'
                          : 'bg-background text-muted-foreground group-hover:text-emerald-500',
                      )}
                    >
                      {isFetchingLastPayment ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CalendarIcon size={16} />
                      )}
                    </div>
                    <div className="space-y-0.5 text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Monthly Installment
                        </p>
                        {!isFetchingLastPayment && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full">
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
                  {Number(amount) === dailyInstallment.adjustedAmount && (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  )}
                </div>
              )}

              {/* Settlement Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/50">
                <div className="space-y-0.5">
                  <Label
                    className="text-xs font-black uppercase tracking-widest cursor-pointer"
                    htmlFor="isSettlement"
                  >
                    Early Settlement
                  </Label>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Recalculate interest for early payment
                  </p>
                </div>
                <input
                  id="isSettlement"
                  type="checkbox"
                  checked={isSettlement}
                  onChange={(e) => handleSettlementToggle(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="amount"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  <DollarSign className="w-3 h-3 text-emerald-500" /> Payment
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 5000"
                  max={isSettlement ? undefined : loan.remainingAmount}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  {...register('amount', {
                    required: 'Payment amount is required',
                    min: { value: 1, message: 'Amount must be greater than 0' },
                  })}
                />
                {errors.amount && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="date"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  <CalendarIcon className="w-3 h-3" /> Transaction Date
                </Label>
                <div className="relative">
                  <input
                    id="date"
                    type="date"
                    className="w-full px-4 py-2.5 sm:py-3 h-auto rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    {...register('date', { required: 'Date is required' })}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setValue('date', newDate);
                      if (isSettlement) {
                        const sAmount = getSettlementDetails().amount;
                        setValue('amount', sAmount.toString());
                      }
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
                {errors.date && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.date.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="notes"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  <MessageSquare className="w-3 h-3" /> Remarks (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Paid via Bank Transfer"
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] sm:min-h-[100px] resize-none"
                  {...register('notes')}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="repay-loan-form"
            type="submit"
            isLoading={loading}
            disabled={
              memberBalance !== null &&
              Number(amount) > memberBalance &&
              !isFetchingBalance
            }
            variant={isSettlement ? 'gradient' : 'success'}
            className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 sm:gap-3"
          >
            {!loading &&
              (isSettlement ? (
                <ArrowDownCircle size={14} />
              ) : (
                <Banknote size={14} />
              ))}
            {isSettlement ? 'Confirm Settlement' : 'Confirm Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Transaction Confirmation */}
    <TransactionConfirmModal
      isOpen={showTxnConfirm}
      onClose={() => { setShowTxnConfirm(false); setPendingFormData(null); }}
      onConfirm={executeRepayment}
      loading={loading}
      type="loan-payment"
      amount={Number(pendingFormData?.amount || amount) || 0}
      details={[
        { label: 'Borrower', value: capitalize(loan?.customer?.name || '') },
        { label: 'Loan #', value: loan?.loanNumber || loan?._id?.slice(-6) || '' },
        { label: 'Type', value: isSettlement ? 'Full Settlement' : 'Installment' },
        { label: 'Outstanding', value: formatCurrency(loan?.remainingAmount || 0) },
      ]}
      description={pendingFormData?.notes || undefined}
      isAdminTransaction
    />
    </>
  );
};

export default RepayLoanModal;
