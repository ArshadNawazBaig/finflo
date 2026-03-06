import { useForm } from 'react-hook-form';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PiggyBank, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const ContributeGoalModal = ({
  isOpen,
  onClose,
  goal,
  onSuccess,
  memberBalance,
}) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm();

  const onSubmit = async ({ amount }) => {
    const numAmount = parseFloat(amount);
    if (numAmount > memberBalance) {
      setError('amount', {
        message: 'Insufficient balance in your main account',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post(
        `/saving-goals/${goal._id}/contribute`,
        { amount: numAmount },
        {
          headers: {
            /* Auth header handled by browser cookies */
          },
        },
      );
      toast.success(`Allocated ${formatCurrency(numAmount)} to ${goal.title}`);
      onSuccess();
      onClose();
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to contribute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 sm:p-10 border-none shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl">
        <DialogHeader className="relative z-10 mb-8">
          <DialogTitle className="text-3xl font-black tracking-tighter">
            Allocate Funds
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            Add money to your "{goal?.title}" goal
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 relative z-10"
        >
          <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                <PiggyBank size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  Available Balance
                </p>
                <p className="font-black tracking-tight">
                  {formatCurrency(memberBalance)}
                </p>
              </div>
            </div>
            <ArrowRight className="text-muted-foreground/30" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Target Progress
              </p>
              <p className="font-black tracking-tight text-primary">
                {goal?.progress}%
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Contribution Amount (PKR)
              </Label>
              <input
                type="number"
                placeholder="Enter amount to save..."
                className="w-full rounded-2xl h-14 bg-muted/30 border border-border/50 text-xl font-black tracking-tighter px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 1, message: 'Amount must be greater than 0' },
                })}
              />
              {errors.amount && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-[2] rounded-2xl h-14 font-black uppercase tracking-widest text-xs"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Allocate Funds'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContributeGoalModal;
