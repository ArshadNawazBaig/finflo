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
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <PiggyBank />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                Allocate Funds
              </p>
              <DialogTitle>Add money to "{goal?.title}"</DialogTitle>
              <DialogDescription className="mt-1">
                Move funds from your main account into this goal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="contribute-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                <PiggyBank />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Available Balance
                </p>
                <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(memberBalance)}
                </p>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Target Progress
              </p>
              <p className="text-sm font-extrabold tracking-tight tabular-nums text-primary">
                {goal?.progress}%
              </p>
            </div>
          </div>

          <FormField
            label="Contribution Amount (PKR)"
            htmlFor="amount"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            error={errors.amount?.message}
          >
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount to save..."
              className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-4 text-xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 1, message: 'Amount must be greater than 0' },
              })}
            />
          </FormField>
        </form>

        <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="contribute-form"
            type="submit"
            disabled={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {loading ? 'Processing...' : 'Allocate Funds'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContributeGoalModal;
