import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
      <DialogContent className="sm:max-w-[500px] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b z-10">
          <DialogHeader className="p-0">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                <Pencil className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-2xl font-black">
                  Edit Loan Agreement
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-sm font-medium">
                  Modifying parameters for{' '}
                  <span className="text-foreground font-bold">
                    {loan.customer?.name}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form
            id="edit-loan-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="principal"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
              >
                <DollarSign className="w-3 h-3 text-emerald-500" /> Capital
                Amount
              </Label>
              <Input
                id="principal"
                type="number"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('principal', {
                  required: 'Principal is required',
                  min: { value: 1, message: 'Must be greater than 0' },
                })}
              />
              {errors.principal && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.principal.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-500" /> Interest Type
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setInterestType('simple')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-black transition-all ${interestType === 'simple' ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20' : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'}`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setInterestType('emi')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-black transition-all ${interestType === 'emi' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20' : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'}`}
                >
                  EMI (Reducing)
                </button>
                <button
                  type="button"
                  onClick={() => setInterestType('compound')}
                  className={`px-3 py-3 rounded-2xl border text-xs font-black transition-all ${interestType === 'compound' ? 'border-rose-500 bg-rose-500/10 text-rose-500 ring-2 ring-rose-500/20' : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'}`}
                >
                  Compound
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="rate"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  <Percent className="w-3 h-3 text-indigo-500" /> APR (%)
                </Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('rate', {
                    required: 'Rate is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                />
                {errors.rate && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.rate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="duration"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  <Clock className="w-3 h-3" /> Term (Months)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('duration', {
                    required: 'Duration is required',
                    min: { value: 1, message: 'Must be ≥ 1' },
                  })}
                />
                {errors.duration && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Agreement Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value)}
              >
                <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:ring-2 focus:ring-primary/20">
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
        <div className="p-6 border-t  z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="edit-loan-form"
            type="submit"
            isLoading={loading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest"
          >
            Confirm Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditLoanModal;
