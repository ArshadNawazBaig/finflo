import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, TrendingUp, Calendar, FileText, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DistributeProfitModal = ({
  isOpen,
  onClose,
  onSuccess,
  type = 'regular',
}) => {
  const isShareDist = type === 'share';
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm({
    defaultValues: {
      totalProfit: '',
      period: new Date().toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      description: '',
      useCustomRates: false,
    },
  });

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      const endpoint = isShareDist
        ? '/members/distribute-share-profit'
        : '/members/distribute-profit';
      const response = await api.post(endpoint, {
        ...formData,
        totalProfit: parseFloat(formData.totalProfit) || 0,
      });

      toast.success(response.data.message || 'Profit distributed successfully');

      if (onSuccess) onSuccess();
      onClose();
      reset();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to distribute profit';
      setError('root', { message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const chipClasses = isShareDist
    ? 'bg-indigo-500/10 text-indigo-500'
    : 'bg-primary/10 text-primary';
  const eyebrowClasses = isShareDist ? 'text-indigo-500' : 'text-primary';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                chipClasses,
              )}
            >
              <TrendingUp />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5',
                  eyebrowClasses,
                )}
              >
                {isShareDist ? 'Share Profit' : 'Profit Distribution'}
              </p>
              <DialogTitle>
                {isShareDist
                  ? 'Distribute Share Profit'
                  : 'Distribute Profit'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isShareDist
                  ? 'Distribute earnings to business share holders.'
                  : 'Share earnings with active regular members.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errors.root && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-4 py-3 text-[11px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95">
            {errors.root.message}
          </div>
        )}

        <form
          id="distribute-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            label={
              <>
                <TrendingUp
                  className={cn(
                    'w-3 h-3',
                    isShareDist ? 'text-indigo-500' : 'text-emerald-500',
                  )}
                />{' '}
                Total Profit to Distribute
              </>
            }
            htmlFor="totalProfit"
            required
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            error={errors.totalProfit?.message}
          >
            <Input
              id="totalProfit"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all h-auto"
              {...register('totalProfit', {
                required: 'Total profit is required',
                min: { value: 1, message: 'Amount must be at least 1' },
              })}
            />
          </FormField>

          <FormField
            label={
              <>
                <Calendar className="w-3 h-3 text-primary" /> Distribution Period
              </>
            }
            htmlFor="period"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            error={errors.period?.message}
          >
            <Input
              id="period"
              type="text"
              placeholder="e.g. Feb 2026"
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
              {...register('period', { required: 'Period is required' })}
            />
          </FormField>

          <FormField
            label={
              <>
                <FileText className="w-3 h-3" /> Description / Notes
              </>
            }
            htmlFor="description"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
          >
            <Textarea
              id="description"
              placeholder="Enter details about this distribution..."
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
              {...register('description')}
            />
          </FormField>

          {!isShareDist && (
            <label
              htmlFor="useCustomRates"
              className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
            >
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200">
                  Use Custom Rates
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  Calculate based on individual member profit rates instead of
                  proportional share.
                </p>
              </div>
              <input
                id="useCustomRates"
                type="checkbox"
                className="w-5 h-5 rounded-lg border-slate-200 bg-white transition-all accent-primary cursor-pointer"
                {...register('useCustomRates')}
              />
            </label>
          )}
          {isShareDist && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1">
              * Share profit is always distributed proportionally based on
              active share holdings.
            </p>
          )}
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
            form="distribute-form"
            type="submit"
            disabled={loading}
            className={cn(
              'h-11 px-7 rounded-full font-bold text-sm hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2',
              isShareDist
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]'
                : 'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]',
            )}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Percent size={14} />
            )}
            {isShareDist ? 'Distribute Share Profit' : 'Distribute Profit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DistributeProfitModal;
