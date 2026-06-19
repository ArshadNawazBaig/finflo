import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { capitalize } from '@/lib/utils';
import FormField from '@/components/ui/FormField';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const RejectLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      reason: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.patch(`/loans/${loan._id}/reject`, {
        reason: data.reason,
      });
      toast.success('Loan request rejected.');
      reset();
      onSuccess();
    } catch (error) {
      console.error('Rejection failed', error);
      toast.error(error.response?.data?.message || 'Failed to reject loan');
    } finally {
      setLoading(false);
    }
  };

  if (!loan) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <X />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400 mb-1.5">
              Destructive action
            </p>
            <DialogTitle>Reject Loan Request</DialogTitle>
            <DialogDescription className="mt-1">
              This action is irreversible. Please provide a reason.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-5 custom-scrollbar">
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                <AlertCircle />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  You are about to reject the loan request for{' '}
                  <span className="font-bold text-slate-900 dark:text-white capitalize">
                    {capitalize(loan.customer?.name) || 'this member'}
                  </span>
                  .
                </p>
                <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400 mt-2 uppercase tracking-[0.15em]">
                  Caution: This cannot be undone
                </p>
              </div>
            </div>

            {/* Grantors Info */}
            <div className="grid grid-cols-1 gap-3">
              {loan.grantor1 && (
                <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Grantor 1
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
                  <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {capitalize(loan.grantor1?.name)}
                  </p>
                </div>
              )}

              {loan.grantor2 && (
                <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Grantor 2
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
                  <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {capitalize(loan.grantor2?.name)}
                  </p>
                </div>
              )}
            </div>

            <form
              id="reject-loan-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-3"
            >
              <FormField
                label="Rejection Reason (Optional)"
                htmlFor="reason"
                labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                <div className="relative group">
                  <Textarea
                    id="reason"
                    {...register('reason')}
                    placeholder="Provide a detailed reason for rejection..."
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-rose-500/20 transition-all min-h-[120px] resize-none leading-relaxed"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400/60 pointer-events-none group-focus-within:text-rose-500/60 transition-colors">
                    Optional Field
                  </div>
                </div>
              </FormField>
            </form>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={loading}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            form="reject-loan-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-rose-500 hover:bg-rose-600 text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <X className="w-4 h-4" />}
            Reject Loan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RejectLoanModal;
