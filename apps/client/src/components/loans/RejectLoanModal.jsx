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
      <DialogContent className="sm:max-w-md rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-red-500">
            <X className="w-5 h-5" />
            Reject Loan Request
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 p-4 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            You are about to reject the loan request for{' '}
            <strong className="capitalize">
              {loan.customer?.name || 'this member'}
            </strong>
            . This action cannot be undone.
          </p>
        </div>

        {/* Grantor Status Section */}
        {loan.grantor && (
          <div className="mt-4 p-4 rounded-xl border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Grantor Verification
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                  loan.grantorStatus === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : loan.grantorStatus === 'rejected'
                      ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}
              >
                {loan.grantorStatus || 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold capitalize">
                {loan.grantor?.name || 'Assigned Grantor'}
              </p>
              {loan.grantorApprovedAt && (
                <p className="text-[10px] text-muted-foreground font-medium">
                  Verified on{' '}
                  {new Date(loan.grantorApprovedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
              Rejection Reason (Optional)
            </label>
            <textarea
              {...register('reason')}
              placeholder="Provide a reason for rejection..."
              className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-3 text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Reject Loan'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RejectLoanModal;
