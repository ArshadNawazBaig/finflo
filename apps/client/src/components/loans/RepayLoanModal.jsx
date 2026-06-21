import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
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
    control,
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
        d.setHours(
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getMilliseconds(),
        );
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
        <DialogContent className="sm:max-w-[500px] !p-0 !gap-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                isSettlement
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-emerald-500/10 text-emerald-500',
              )}
            >
              <Wallet />
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5',
                  isSettlement
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-emerald-500 dark:text-emerald-400',
                )}
              >
                {isSettlement ? 'Early Settlement' : 'Loan Repayment'}
              </p>
              <DialogTitle>
                {isSettlement ? 'Early Loan Settlement' : 'Pay Back Loan'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isSettlement
                  ? 'Calculate interest up to today and close the loan'
                  : `Submit a new installment for ${capitalize(loan.customer?.name)}`}
              </DialogDescription>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-5 custom-scrollbar">
            {/* Settlement Info Card */}
            <div
              className={cn(
                'rounded-2xl p-4 mb-4 border transition-colors',
                isSettlement
                  ? 'bg-blue-500/5 border-blue-500/15'
                  : 'bg-emerald-500/5 border-emerald-500/15',
              )}
            >
              <div className="flex items-center justify-between mb-2 last:mb-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5',
                      isSettlement
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    <ArrowDownCircle />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-[0.15em]',
                      isSettlement
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {isSettlement ? 'Settlement Amount' : 'Outstanding'}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-lg font-extrabold tracking-tight tabular-nums',
                    isSettlement
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {formatCurrency(
                    isSettlement ? settlementAmount : loan.remainingAmount,
                  )}
                </span>
              </div>

              {isSettlement && (
                <div className="mt-3 p-3 bg-blue-500/10 rounded-xl space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600/80 dark:text-blue-400/80">
                    <span>Annual Rate</span>
                    <span className="tabular-nums">{loan.rate}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600/80 dark:text-blue-400/80">
                    <span>Original Term</span>
                    <span className="tabular-nums">{loan.duration} Months</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600/80 dark:text-blue-400/80">
                    <span>Days Active</span>
                    <span className="tabular-nums">{details.daysElapsed} Days</span>
                  </div>
                  <div className="pt-1.5 border-t border-blue-500/20 flex justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-blue-600 dark:text-blue-400">
                    <span>Adjusted Interest</span>
                    <span className="tabular-nums">{formatCurrency(details.interest)}</span>
                  </div>
                </div>
              )}

              {/* Member Balance Alert */}
              {memberBalance !== null && (
                <div
                  className={cn(
                    'mt-3 p-3 rounded-xl border flex gap-3 transition-colors',
                    Number(amount) > memberBalance
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  <Wallet className="w-5 h-5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">
                      Available Member Balance
                    </p>
                    <p className="text-lg font-extrabold tracking-tight tabular-nums">
                      {isFetchingBalance ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        formatCurrency(memberBalance)
                      )}
                    </p>
                    {Number(amount) > memberBalance && !isFetchingBalance && (
                      <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1">
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
              className="space-y-4"
            >
              <div className="space-y-4">
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
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-50/40 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] hover:border-emerald-500/30',
                      isFetchingLastPayment && 'opacity-60 pointer-events-none',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5',
                          Number(amount) === dailyInstallment.adjustedAmount
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-white dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 group-hover:text-emerald-500',
                        )}
                      >
                        {isFetchingLastPayment ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <CalendarIcon />
                        )}
                      </div>
                      <div className="space-y-0.5 text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                            Monthly Installment
                          </p>
                          {!isFetchingLastPayment && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {dailyInstallment.daysPassed}d
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
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
                    {Number(amount) === dailyInstallment.adjustedAmount && (
                      <CheckCircle2 size={20} className="text-emerald-500" />
                    )}
                  </div>
                )}

                {/* Settlement Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                  <div className="space-y-0.5">
                    <Label
                      className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer"
                      htmlFor="isSettlement"
                    >
                      Early Settlement
                    </Label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Recalculate interest for early payment
                    </p>
                  </div>
                  <input
                    id="isSettlement"
                    type="checkbox"
                    checked={isSettlement}
                    onChange={(e) => handleSettlementToggle(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-slate-200 dark:border-white/[0.1] text-primary focus:ring-primary/20 cursor-pointer"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="amount"
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                  >
                    <DollarSign className="w-3 h-3 text-emerald-500" /> Payment
                    Amount
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g. 5000"
                    max={isSettlement ? undefined : loan.remainingAmount}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('amount', {
                      required: 'Payment amount is required',
                      min: {
                        value: 1,
                        message: 'Amount must be greater than 0',
                      },
                    })}
                  />
                  {errors.amount && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="date"
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                  >
                    <CalendarIcon className="w-3 h-3" /> Transaction Date
                  </Label>
                  <Controller
                    name="date"
                    control={control}
                    rules={{ required: 'Date is required' }}
                    render={({ field }) => (
                      <DatePicker
                        id="date"
                        value={field.value}
                        onChange={(iso) => {
                          field.onChange(iso);
                          if (isSettlement) {
                            const sAmount = getSettlementDetails().amount;
                            setValue('amount', sAmount.toString());
                          }
                        }}
                        allowClear={false}
                        className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-semibold focus-visible:ring-primary/20"
                      />
                    )}
                  />
                  {errors.date && (
                    <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.date.message}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="notes"
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                  >
                    <MessageSquare className="w-3 h-3" /> Remarks (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g. Paid via Bank Transfer"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[90px] resize-none"
                    {...register('notes')}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              form="repay-loan-form"
              type="submit"
              isLoading={loading}
              disabled={
                memberBalance !== null &&
                Number(amount) > memberBalance &&
                !isFetchingBalance
              }
              className={cn(
                'h-11 px-7 rounded-full font-bold text-sm text-white hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2',
                isSettlement
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)]'
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]',
              )}
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
        onClose={() => {
          setShowTxnConfirm(false);
          setPendingFormData(null);
        }}
        onConfirm={executeRepayment}
        loading={loading}
        type="loan-payment"
        amount={Number(pendingFormData?.amount || amount) || 0}
        details={[
          { label: 'Borrower', value: capitalize(loan?.customer?.name || '') },
          {
            label: 'Loan #',
            value: loan?.loanNumber || loan?._id?.slice(-6) || '',
          },
          {
            label: 'Type',
            value: isSettlement ? 'Full Settlement' : 'Installment',
          },
          {
            label: 'Outstanding',
            value: formatCurrency(loan?.remainingAmount || 0),
          },
        ]}
        description={pendingFormData?.notes || undefined}
        isAdminTransaction
      />
    </>
  );
};

export default RepayLoanModal;
