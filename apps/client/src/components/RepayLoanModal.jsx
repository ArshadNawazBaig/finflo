import { useState } from 'react';
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
} from 'lucide-react';
import { formatPKR } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

const RepayLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  if (!loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/repayments', {
        loanId: loan._id,
        amount: Number(formData.amount),
        date: formData.date,
        notes: formData.notes,
      });

      toast.success('Repayment recorded successfully');
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
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">
                Pay Back Loan
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Submit a new installment for{' '}
                <span className="text-foreground font-bold">
                  {loan.customer?.name}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Remaining Balance Card */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem] p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-600">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700/70">
              Outstanding
            </span>
          </div>
          <span className="text-lg font-black text-emerald-600">
            {formatPKR(loan.remainingAmount)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Amount */}
            <div className="space-y-2">
              <Label
                htmlFor="amount"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
              >
                <DollarSign className="w-3 h-3 text-emerald-500" /> Payment
                Amount (Rs.)
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
                max={loan.remainingAmount}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
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
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-4 py-3 h-[46px] rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <CalendarIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
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
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              variant="success"
              className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Recording...
                </div>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RepayLoanModal;
