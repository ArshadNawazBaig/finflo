import { useState } from 'react';
import { Check, Loader2, Percent, Calendar } from 'lucide-react';
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

const ApproveLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      principal: loan?.principal || 0,
      rate: loan?.rate || 0,
      duration: loan?.duration || 0,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

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
      <DialogContent className="sm:max-w-md rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            Approve Loan
          </DialogTitle>
          <DialogDescription>
            Review and finalize the loan terms before activating it for the
            member.
          </DialogDescription>
        </DialogHeader>

        {loan.riskDetails ? (
          <div
            className={`mt-4 p-4 rounded-xl border ${
              ['A+', 'A'].includes(loan.riskDetails.grade)
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : ['B', 'C'].includes(loan.riskDetails.grade)
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                AI Risk Assessment
              </h4>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  ['A+', 'A'].includes(loan.riskDetails.grade)
                    ? 'bg-emerald-500 text-white'
                    : ['B', 'C'].includes(loan.riskDetails.grade)
                      ? 'bg-amber-500 text-white'
                      : 'bg-red-500 text-white'
                }`}
              >
                Grade {loan.riskDetails.grade}
              </span>
            </div>
            <p className="text-sm font-bold mb-2">
              Recommended: {loan.riskDetails.suggestion}
            </p>
            <ul className="space-y-1">
              {loan.riskDetails.factors.map((factor, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-muted-foreground flex items-center gap-2"
                >
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl border border-dashed border-border/50 bg-muted/5 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">
              AI Risk Assessment
            </span>
            <span className="text-xs font-black text-muted-foreground/50">
              —
            </span>
          </div>
        )}

        {/* Grantor 1 Status Section */}
        {loan.grantor1 && (
          <div className="mt-4 p-4 rounded-xl border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Grantor 1 Verification
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold capitalize">
                {loan.grantor1?.name || 'Assigned Grantor 1'}
              </p>
              {loan.grantor1ApprovedAt && (
                <p className="text-[10px] text-muted-foreground font-medium">
                  Approved on{' '}
                  {new Date(loan.grantor1ApprovedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Grantor 2 Status Section */}
        {loan.grantor2 && (
          <div className="mt-4 p-4 rounded-xl border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Grantor 2 Verification
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
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
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold capitalize">
                {loan.grantor2?.name || 'Assigned Grantor 2'}
              </p>
              {loan.grantor2ApprovedAt && (
                <p className="text-[10px] text-muted-foreground font-medium">
                  Approved on{' '}
                  {new Date(loan.grantor2ApprovedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                Principal
              </label>
              <input
                type="number"
                {...register('principal', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                Interest Rate
              </label>
              <input
                type="number"
                step="0.01"
                {...register('rate', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                Duration (Months)
              </label>
              <input
                type="number"
                {...register('duration', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground ml-1">
                Start Date
              </label>
              <input
                type="date"
                {...register('startDate', { required: true })}
                className="w-full bg-muted/50 border border-border/50 rounded-lg px-4 py-2 text-sm font-bold"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              className="flex-1 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Confirm Approval
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveLoanModal;
