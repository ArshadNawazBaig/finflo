import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import FormField from '@/components/ui/FormField';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const ApproveLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      principal: loan?.principal || 0,
      rate: loan?.rate || 0,
      duration: loan?.duration || 0,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (loan?.rate === 0) {
        try {
          const { data } = await api.get('/system-settings');
          if (data?.defaultInterestRate) {
            setValue('rate', data.defaultInterestRate);
          }
        } catch (error) {
          console.error('Failed to fetch settings', error);
        }
      }
    };
    fetchSettings();
  }, [loan, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.patch(`/loans/${loan._id}/approve`, {
        ...data,
      });
      toast.success('Loan approved and activated!');
      onSuccess();
    } catch (error) {
      console.error('Approval failed', error);
      toast.error(error.response?.data?.message || 'Failed to approve loan');
    } finally {
      setLoading(false);
    }
  };

  if (!loan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Check />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400 mb-1.5">
              Approve & Activate
            </p>
            <DialogTitle>Approve Loan</DialogTitle>
            <DialogDescription className="mt-1">
              Review and finalize the loan terms before activating it.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-5 custom-scrollbar">
          <div className="space-y-4">
            {loan.riskDetails ? (
              <div
                className={`rounded-2xl border p-4 ${
                  ['A+', 'A'].includes(loan.riskDetails.grade)
                    ? 'bg-emerald-500/5 border-emerald-500/15'
                    : ['B', 'C'].includes(loan.riskDetails.grade)
                      ? 'bg-amber-500/5 border-amber-500/15'
                      : 'bg-rose-500/5 border-rose-500/15'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    AI Risk Assessment
                  </h4>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      ['A+', 'A'].includes(loan.riskDetails.grade)
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : ['B', 'C'].includes(loan.riskDetails.grade)
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    Grade {loan.riskDetails.grade}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Recommended:
                  </span>{' '}
                  {loan.riskDetails.suggestion}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {loan.riskDetails.factors.map((factor, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-white/[0.05] text-slate-500 dark:text-slate-400"
                    >
                      • {factor}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-white/[0.02] p-4 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  AI Risk Assessment
                </span>
                <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                  Not Evaluated
                </span>
              </div>
            )}

            {/* Grantors Grid */}
            <div className="grid grid-cols-1 gap-3">
              {loan.grantor1 && (
                <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Grantor 1 Verification
                    </h4>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        loan.grantor1Status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : loan.grantor1Status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {loan.grantor1Status || 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                      {loan.grantor1?.name || 'Assigned Grantor 1'}
                    </p>
                    {loan.grantor1ApprovedAt && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(loan.grantor1ApprovedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {loan.grantor2 && (
                <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Grantor 2 Verification
                    </h4>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        loan.grantor2Status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : loan.grantor2Status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {loan.grantor2Status || 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                      {loan.grantor2?.name || 'Assigned Grantor 2'}
                    </p>
                    {loan.grantor2ApprovedAt && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {new Date(loan.grantor2ApprovedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <form
              id="approve-loan-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 pt-1"
            >
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Principal"
                  htmlFor="principal"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Input
                    id="principal"
                    type="number"
                    {...register('principal', { required: true })}
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500/20 transition-all h-auto"
                  />
                </FormField>
                <FormField
                  label="Rate (%)"
                  htmlFor="rate"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    {...register('rate', { required: true })}
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500/20 transition-all h-auto"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Duration (Mo)"
                  htmlFor="duration"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Input
                    id="duration"
                    type="number"
                    {...register('duration', { required: true })}
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500/20 transition-all h-auto"
                  />
                </FormField>
                <FormField
                  label="Start Date"
                  htmlFor="startDate"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  <Controller
                    name="startDate"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <DatePicker
                        id="startDate"
                        value={field.value}
                        onChange={field.onChange}
                        allowClear={false}
                        className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium text-slate-500 dark:text-slate-400 focus-visible:ring-emerald-500/20"
                      />
                    )}
                  />
                </FormField>
              </div>
            </form>
          </div>
        </div>

        {/* Fixed Footer */}
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
            form="approve-loan-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <Check className="w-4 h-4" />}
            Confirm Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveLoanModal;
