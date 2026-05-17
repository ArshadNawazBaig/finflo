import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Tag, Target, Zap, Repeat, Sparkles } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CreateSavingGoalModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  // Auto-contribute config — kept in local state since both modes are
  // optional and have nested sub-fields. Sent up at submit time.
  const [roundupEnabled, setRoundupEnabled] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringDay, setRecurringDay] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      targetAmount: '',
      category: 'other',
      deadline: '',
    },
  });

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      const autoContribute = {};
      if (roundupEnabled) {
        autoContribute.roundup = { enabled: true, sourceAccount: 'current' };
      }
      if (recurringEnabled && Number(recurringAmount) > 0) {
        autoContribute.recurring = {
          enabled: true,
          amount: Math.round(Number(recurringAmount)),
          dayOfMonth: Math.max(1, Math.min(28, parseInt(recurringDay, 10) || 1)),
          sourceAccount: 'current',
        };
      }
      const payload = Object.keys(autoContribute).length
        ? { ...formData, autoContribute }
        : formData;

      await api.post('/saving-goals', payload, {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      toast.success('Goal created successfully!');
      onSuccess();
      onClose();
      reset();
      setRoundupEnabled(false);
      setRecurringEnabled(false);
      setRecurringAmount('');
      setRecurringDay(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create goal');
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
              <Target />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                New Saving Goal
              </p>
              <DialogTitle>What are you working towards?</DialogTitle>
              <DialogDescription className="mt-1">
                Set a target and start building toward it.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="create-goal-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Goal Title
            </label>
            <input
              type="text"
              placeholder="e.g., New MacBook Pro"
              className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              {...register('title', { required: 'Goal title is required' })}
            />
            {errors.title && (
              <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Target Amount (PKR)
            </label>
            <input
              type="number"
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              {...register('targetAmount', {
                required: 'Target amount is required',
                min: { value: 1, message: 'Amount must be greater than 0' },
              })}
            />
            {errors.targetAmount && (
              <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.targetAmount.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Tag size={11} /> Category
              </label>
              <Select
                defaultValue="other"
                onValueChange={(val) => setValue('category', val)}
              >
                <SelectTrigger className="rounded-2xl h-[46px] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-xl">
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="gadget">Gadget</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar size={11} /> Deadline
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                style={{ colorScheme: 'auto' }}
                {...register('deadline')}
              />
            </div>
          </div>

          {/* ── Auto-contribute (optional) ───────────────────────────────── */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                Auto-contribute · optional
              </p>
            </div>

            {/* Round-up toggle */}
            <label
              className={cn(
                'flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors',
                roundupEnabled
                  ? 'border-primary/30 bg-primary/[0.04]'
                  : 'border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-100/40 dark:hover:bg-white/[0.04]',
              )}
            >
              <input
                type="checkbox"
                checked={roundupEnabled}
                onChange={(e) => setRoundupEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary/40"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap size={11} className="text-primary" /> Round up every spend
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Each debit rounds up to the nearest Rs. 10 and the change goes
                  into this goal.
                </p>
              </div>
            </label>

            {/* Monthly recurring */}
            <div
              className={cn(
                'rounded-2xl border transition-colors overflow-hidden',
                recurringEnabled
                  ? 'border-primary/30 bg-primary/[0.04]'
                  : 'border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]',
              )}
            >
              <label className="flex items-start gap-3 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recurringEnabled}
                  onChange={(e) => setRecurringEnabled(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary/40"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Repeat size={11} className="text-primary" /> Auto-deposit
                    monthly
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    Move a fixed amount from your current account on the same
                    day each month.
                  </p>
                </div>
              </label>

              {recurringEnabled && (
                <div className="grid grid-cols-[1fr,auto] gap-2 px-3 pb-3 animate-in fade-in slide-in-from-top-1">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Amount (Rs.)
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 5000"
                      value={recurringAmount}
                      onChange={(e) => setRecurringAmount(e.target.value)}
                      className="w-full rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Day
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(e.target.value)}
                      className="w-20 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </button>
          <Button
            form="create-goal-form"
            type="submit"
            disabled={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSavingGoalModal;
