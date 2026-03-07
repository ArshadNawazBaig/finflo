import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
      <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl">
        {/* Fixed Header */}
        <div className="p-8 border-b bg-background z-10 shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 shadow-sm border border-rose-500/20">
              <X className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-rose-600">
                Reject Loan Request
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                This action is irreversible. Please provide a reason.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="space-y-6">
            <div className="p-5 rounded-[1.5rem] bg-rose-500/5 border border-rose-500/10 flex items-start gap-4 shadow-sm">
              <div className="p-2 rounded-full bg-rose-500/10 text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-900/80 dark:text-rose-200/80 leading-relaxed">
                  You are about to reject the loan request for{' '}
                  <span className="font-black underline decoration-rose-500/30 underline-offset-4 capitalize">
                    {loan.customer?.name || 'this member'}
                  </span>
                  .
                </p>
                <p className="text-[11px] font-bold text-rose-500/80 mt-2 uppercase tracking-wider">
                  Caution: This cannot be undone
                </p>
              </div>
            </div>

            {/* Grantors Info */}
            <div className="grid grid-cols-1 gap-4">
              {loan.grantor1 && (
                <div className="p-5 rounded-[1.5rem] border border-border/50 bg-background/50 shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Grantor 1
                    </h4>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        loan.grantor1Status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : loan.grantor1Status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {loan.grantor1Status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground/90 capitalize">
                    {loan.grantor1?.name}
                  </p>
                </div>
              )}

              {loan.grantor2 && (
                <div className="p-5 rounded-[1.5rem] border border-border/50 bg-background/50 shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Grantor 2
                    </h4>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        loan.grantor2Status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : loan.grantor2Status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}
                    >
                      {loan.grantor2Status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground/90 capitalize">
                    {loan.grantor2?.name}
                  </p>
                </div>
              )}
            </div>

            <form
              id="reject-loan-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
                  Rejection Reason (Optional)
                </label>
                <div className="relative group">
                  <textarea
                    {...register('reason')}
                    placeholder="Provide a detailed reason for rejection..."
                    className="w-full bg-background border border-border/50 rounded-2xl px-5 py-4 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all hover:border-border min-h-[140px] resize-none leading-relaxed"
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] font-bold text-muted-foreground/40 pointer-events-none group-focus-within:text-rose-500/40 transition-colors">
                    Optional Field
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-8 border-t bg-background shrink-0 flex gap-4">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={loading}
            className="flex-1 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-[1.25rem] border border-transparent hover:border-border/50 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            form="reject-loan-form"
            type="submit"
            isLoading={loading}
            className="flex-1 h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/20 transition-all active:scale-95"
          >
            {!loading && <X className="w-4 h-4 mr-2" />}
            Reject Loan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RejectLoanModal;
