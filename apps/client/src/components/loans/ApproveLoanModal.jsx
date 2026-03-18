import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
      <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2rem] border-border/50 shadow-2xl">
        {/* Fixed Header */}
        <div className="p-8 border-b bg-background z-10 shrink-0 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 shadow-sm border border-emerald-500/20">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                Approve Loan
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                Review and finalize the loan terms before activating it.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="space-y-6">
            {loan.riskDetails ? (
              <div
                className={`p-5 rounded-[1.5rem] border shadow-sm transition-all hover:shadow-md ${
                  ['A+', 'A'].includes(loan.riskDetails.grade)
                    ? 'bg-emerald-500/5 border-emerald-500/10'
                    : ['B', 'C'].includes(loan.riskDetails.grade)
                      ? 'bg-amber-500/5 border-amber-500/10'
                      : 'bg-red-500/5 border-red-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                    AI Risk Assessment
                  </h4>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      ['A+', 'A'].includes(loan.riskDetails.grade)
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : ['B', 'C'].includes(loan.riskDetails.grade)
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                          : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                    }`}
                  >
                    Grade {loan.riskDetails.grade}
                  </span>
                </div>
                <p className="text-sm font-bold mb-3 text-foreground/90 leading-relaxed">
                  Recommended: {loan.riskDetails.suggestion}
                </p>
                <div className="flex flex-wrap gap-2">
                  {loan.riskDetails.factors.map((factor, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-background/50 border border-border/50 text-muted-foreground"
                    >
                      • {factor}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-[1.5rem] border border-dashed border-border/50 bg-muted/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  AI Risk Assessment
                </span>
                <span className="text-sm font-black text-muted-foreground/30">
                  Not Evaluated
                </span>
              </div>
            )}

            {/* Grantors Grid */}
            <div className="grid grid-cols-1 gap-4">
              {loan.grantor1 && (
                <div className="p-5 rounded-[1.5rem] border border-border/50 bg-background/50 shadow-sm transition-all hover:border-primary/20 group">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Grantor 1 Verification
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
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-foreground/90 group-hover:text-primary transition-colors capitalize">
                      {loan.grantor1?.name || 'Assigned Grantor 1'}
                    </p>
                    {loan.grantor1ApprovedAt && (
                      <p className="text-[10px] text-muted-foreground/60 font-medium">
                        {new Date(loan.grantor1ApprovedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {loan.grantor2 && (
                <div className="p-5 rounded-[1.5rem] border border-border/50 bg-background/50 shadow-sm transition-all hover:border-primary/20 group">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Grantor 2 Verification
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
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-foreground/90 group-hover:text-primary transition-colors capitalize">
                      {loan.grantor2?.name || 'Assigned Grantor 2'}
                    </p>
                    {loan.grantor2ApprovedAt && (
                      <p className="text-[10px] text-muted-foreground/60 font-medium">
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
              className="space-y-6 pt-2"
            >
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
                    Principal
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      {...register('principal', { required: true })}
                      className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3.5 text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all hover:border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
                    Rate (%)
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.01"
                      {...register('rate', { required: true })}
                      className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3.5 text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all hover:border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
                    Duration (Mo)
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      {...register('duration', { required: true })}
                      className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3.5 text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all hover:border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-1">
                    Start Date
                  </label>
                  <div className="relative group">
                    <input
                      type="date"
                      {...register('startDate', { required: true })}
                      className="w-full bg-background border border-border/50 rounded-2xl px-5 py-3.5 text-sm font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all hover:border-border appearance-none"
                    />
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
            onClick={onClose}
            className="flex-1 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted transition-all rounded-[1.25rem] border border-transparent hover:border-border/50 active:scale-95"
          >
            Cancel
          </button>
          <Button
            form="approve-loan-form"
            type="submit"
            isLoading={loading}
            className="flex-1 h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
          >
            {!loading && <Check className="w-4 h-4 mr-2" />}
            Confirm Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveLoanModal;
