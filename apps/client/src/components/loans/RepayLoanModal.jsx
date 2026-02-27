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
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Loader2,
  DollarSign,
  MessageSquare,
  ArrowDownCircle,
  Banknote,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const RepayLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [memberBalance, setMemberBalance] = useState(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSettlement, setIsSettlement] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (isOpen && loan?.customer?.isMember && loan?.customer?.memberId) {
      const fetchMemberBalance = async () => {
        setIsFetchingBalance(true);
        try {
          const { data } = await api.get(`/members/${loan.customer.memberId}`);
          setMemberBalance(data.currentBalance || 0);
        } catch (error) {
          console.error('Failed to fetch member balance', error);
          // Fallback or handle error silently so it doesn't block entirely
        } finally {
          setIsFetchingBalance(false);
        }
      };
      fetchMemberBalance();
    } else {
      setMemberBalance(null);
    }
  }, [isOpen, loan]);

  if (!loan) return null;

  // Calculate settlement amount preview
  const getSettlementDetails = () => {
    const start = new Date(loan.startDate);
    const now = new Date(formData.date || new Date());

    let monthsElapsed =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());

    if (now.getDate() > start.getDate()) {
      monthsElapsed++;
    }

    monthsElapsed = Math.max(1, monthsElapsed);

    if (monthsElapsed >= loan.duration) {
      return {
        amount: loan.remainingAmount,
        monthsElapsed,
        interest: loan.totalAmount - loan.principal,
        isEarly: false,
      };
    }

    const interest = (loan.principal * loan.rate * monthsElapsed) / 1200;
    const adjustedTotal = loan.principal + interest;
    return {
      amount: Math.round(Math.max(0, adjustedTotal - loan.paidAmount)),
      monthsElapsed,
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
      setFormData({ ...formData, amount: '' }); // Clear amount when toggling off
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/repayments', {
        loanId: loan._id,
        amount: Number(formData.amount),
        date: formData.date,
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
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to record repayment',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
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
                <span>Months Active</span>
                <span>{details.monthsElapsed} Months</span>
              </div>
              <div className="pt-1 border-t border-blue-500/20 flex justify-between text-[10px] font-black uppercase text-blue-600">
                <span>Adjusted Interest</span>
                <span>{formatCurrency(details.interest)}</span>
              </div>
            </div>
          )}

          {/* Member Balance Alert (Only for Members) */}
          {memberBalance !== null && (
            <div
              className={cn(
                'mt-3 p-3 rounded-xl border flex gap-3 transition-colors',
                Number(formData.amount) > memberBalance
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
                {Number(formData.amount) > memberBalance &&
                  !isFetchingBalance && (
                    <p className="text-[10px] font-black text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle size={12} /> Exceeds available funds
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 p-0 sm:px-0 sm:pb-0"
        >
          <div className="space-y-4 sm:space-y-5">
            {/* Quick Option: Monthly Installment */}
            {loan.emi > 0 && !isSettlement && (
              <div
                onClick={() =>
                  setFormData({ ...formData, amount: loan.emi.toString() })
                }
                className={cn(
                  'p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between group',
                  Number(formData.amount) === loan.emi
                    ? 'bg-emerald-500/5 border-emerald-500/20 shadow-sm'
                    : 'bg-muted/30 border-border/50 hover:border-emerald-500/30',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-xl transition-colors',
                      Number(formData.amount) === loan.emi
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-background text-muted-foreground group-hover:text-emerald-500',
                    )}
                  >
                    <CalendarIcon size={16} />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Monthly Installment
                    </p>
                    <p className="text-sm font-black text-foreground">
                      {formatCurrency(loan.emi)}
                    </p>
                  </div>
                </div>
                {Number(formData.amount) === loan.emi && (
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
                required
                placeholder="e.g. 5000"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                max={isSettlement ? undefined : loan.remainingAmount}
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
              />
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
                  required
                  value={formData.date}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormData({ ...formData, date: newDate });
                    // If settlement is active, update amount based on new date
                    if (isSettlement) {
                      const sAmount = getSettlementDetails().amount;
                      setFormData({
                        ...formData,
                        date: newDate,
                        amount: sAmount.toString(),
                      });
                    }
                  }}
                  className="w-full px-4 py-2.5 sm:py-3 h-auto rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
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
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] sm:min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={loading}
              disabled={
                memberBalance !== null &&
                Number(formData.amount) > memberBalance &&
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
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RepayLoanModal;
