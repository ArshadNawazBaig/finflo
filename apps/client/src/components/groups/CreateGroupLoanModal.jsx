import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Layers,
  PlusCircle,
  Percent,
  Clock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import FormField from '@/components/ui/FormField';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize } from '@/lib/utils';

const INTEREST_TYPES = [
  { value: 'simple', label: 'Simple', active: 'border-orange-500/40 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20 hover:bg-orange-500/10 hover:text-orange-500' },
  { value: 'emi', label: 'EMI (Reducing)', active: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500' },
  { value: 'compound', label: 'Compound', active: 'border-rose-500/40 bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500' },
];

const CreateGroupLoanModal = ({ isOpen, onClose, onSuccess, group }) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { rate: '', duration: '' } });

  const [interestType, setInterestType] = useState('simple');
  const [startDate, setStartDate] = useState(new Date());
  // Map of customerId -> principal string.
  const [principals, setPrincipals] = useState({});
  const [loading, setLoading] = useState(false);

  // Only active members are eligible to take a sub-loan in a new cycle.
  const activeMembers = useMemo(
    () =>
      (group?.members || []).filter((m) => (m.status || 'active') === 'active'),
    [group],
  );

  useEffect(() => {
    if (!isOpen) return;
    reset({ rate: '', duration: '' });
    setInterestType('simple');
    setStartDate(new Date());
    setPrincipals({});
  }, [isOpen, reset]);

  const totalPrincipal = useMemo(
    () =>
      Object.values(principals).reduce(
        (sum, v) => sum + (parseFloat(v) || 0),
        0,
      ),
    [principals],
  );

  const onSubmit = async (formData) => {
    const allocations = activeMembers
      .map((m) => {
        const id = m.customer?._id || m.customer;
        const principal = parseFloat(principals[id]);
        return { customer: id, principal };
      })
      .filter((a) => a.principal > 0);

    if (allocations.length === 0) {
      setError('root', {
        message: 'Enter a principal greater than 0 for at least one member.',
      });
      return;
    }

    const payload = {
      rate: formData.rate,
      duration: formData.duration,
      interestType,
      startDate: startDate.toISOString().split('T')[0],
      allocations,
    };

    setLoading(true);
    try {
      await api.post(`/groups/${group._id}/loans`, payload);
      toast.success('Group loan cycle created');
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to create group loan';
      setError('root', { message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] !p-0 !gap-0 flex flex-col overflow-hidden">
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Layers />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5">
              New Cycle
            </p>
            <DialogTitle>New Group Loan</DialogTitle>
            <DialogDescription className="mt-1">
              Shared terms with a per-member principal allocation.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {errors.root && (
            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-rose-500/20 mb-5 animate-in fade-in zoom-in-95">
              {errors.root.message}
            </div>
          )}

          <form
            id="create-group-loan-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Rate & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={
                  <>
                    <Percent className="w-3 h-3 text-indigo-500" /> Interest Rate
                    (%)
                  </>
                }
                htmlFor="rate"
                labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                error={errors.rate?.message}
              >
                <Input
                  id="rate"
                  type="number"
                  placeholder="e.g. 15"
                  min="0"
                  step="0.1"
                  className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50"
                  {...register('rate', {
                    required: 'Interest rate is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                />
              </FormField>
              <FormField
                label={
                  <>
                    <Clock className="w-3 h-3" /> Term (Months)
                  </>
                }
                htmlFor="duration"
                labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                error={errors.duration?.message}
              >
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g. 12"
                  min="1"
                  className="h-auto px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('duration', {
                    required: 'Duration is required',
                    min: { value: 1, message: 'Must be ≥ 1 month' },
                  })}
                />
              </FormField>
            </div>

            {/* Interest Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-500" /> Interest Type
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {INTEREST_TYPES.map((t) => (
                  <Button
                    key={t.value}
                    type="button"
                    variant="ghost"
                    onClick={() => setInterestType(t.value)}
                    className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      interestType === t.value
                        ? t.active
                        : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Start Date */}
            <FormField
              label={
                <>
                  <CalendarIcon className="w-3 h-3" /> Commencement
                </>
              }
              htmlFor="startDate"
              labelClassName="normal-case tracking-normal px-0 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
            >
              <DatePicker
                id="startDate"
                value={startDate}
                onChange={(iso) => setStartDate(new Date(iso))}
                allowClear={false}
                className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium text-slate-500 dark:text-slate-400 focus-visible:ring-primary/20"
              />
            </FormField>

            {/* Per-member principal grid */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Per-Member Principal
              </label>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                Only members with a principal above 0 are included in this cycle.
              </p>
              <div className="mt-1 rounded-2xl border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06]">
                {activeMembers.length === 0 && (
                  <p className="px-4 py-5 text-center text-[11px] font-semibold text-slate-400">
                    No active members available.
                  </p>
                )}
                {activeMembers.map((m) => {
                  const id = m.customer?._id || m.customer;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold capitalize text-slate-900 dark:text-white truncate">
                          {capitalize(m.customer?.name || 'Member')}
                        </p>
                        {m.role === 'leader' && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-600">
                            Leader
                          </span>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={principals[id] || ''}
                        onChange={(e) =>
                          setPrincipals((prev) => ({
                            ...prev,
                            [id]: e.target.value,
                          }))
                        }
                        className="h-auto w-32 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] font-semibold text-right focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between px-1 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Principal
                </span>
                <span className="text-sm font-black text-primary">
                  {formatCurrency(totalPrincipal)}
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="create-group-loan-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <PlusCircle size={14} />}
            Create Cycle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupLoanModal;
