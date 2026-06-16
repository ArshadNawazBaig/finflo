import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Pencil, DollarSign, Percent, Clock, Activity } from 'lucide-react';

const EditLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [interestType, setInterestType] = useState('simple');
  const [status, setStatus] = useState('active');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (loan) {
      reset({
        principal: loan.principal,
        rate: loan.rate,
        duration: loan.duration,
      });
      setInterestType(loan.interestType || 'simple');
      setStatus(loan.status);
    }
  }, [loan, reset]);

  if (!loan) return null;

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      await api.put(`/loans/${loan._id}`, {
        ...formData,
        interestType,
        status,
      });
      toast.success('Loan updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update loan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Pencil />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
              Edit Loan
            </p>
            <DialogTitle>Edit Loan Agreement</DialogTitle>
            <DialogDescription className="mt-1">
              Modifying parameters for{' '}
              <span className="text-slate-900 dark:text-white font-semibold">
                {loan.customer?.name}
              </span>
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          <form
            id="edit-loan-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="principal"
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
              >
                <DollarSign className="w-3 h-3 text-emerald-500" /> Capital
                Amount
              </Label>
              <Input
                id="principal"
                type="number"
                className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('principal', {
                  required: 'Principal is required',
                  min: { value: 1, message: 'Must be greater than 0' },
                })}
              />
              {errors.principal && (
                <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.principal.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-500" /> Interest Type
              </Label>
              <div className="grid grid-cols-3 gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInterestType('simple')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${interestType === 'simple' ? 'border-orange-500/40 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20 hover:bg-orange-500/10 hover:text-orange-500' : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                >
                  Simple
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInterestType('emi')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${interestType === 'emi' ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20 hover:bg-indigo-500/10 hover:text-indigo-500' : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                >
                  EMI (Reducing)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInterestType('compound')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-bold transition-all ${interestType === 'compound' ? 'border-rose-500/40 bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500' : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                >
                  Compound
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="rate"
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                >
                  <Percent className="w-3 h-3 text-indigo-500" /> APR (%)
                </Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('rate', {
                    required: 'Rate is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                />
                {errors.rate && (
                  <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.rate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="duration"
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2"
                >
                  <Clock className="w-3 h-3" /> Term (Months)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('duration', {
                    required: 'Duration is required',
                    min: { value: 1, message: 'Must be ≥ 1' },
                  })}
                />
                {errors.duration && (
                  <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Agreement Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value)}
              >
                <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            form="edit-loan-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Confirm Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLoanModal;
