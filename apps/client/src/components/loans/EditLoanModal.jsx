import { useState, useEffect } from 'react';
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
import {
  Pencil,
  Loader2,
  DollarSign,
  Percent,
  Clock,
  Activity,
} from 'lucide-react';

const EditLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    principal: '',
    rate: '',
    duration: '',
    status: '',
    interestType: 'simple',
  });

  useEffect(() => {
    if (loan) {
      setFormData({
        principal: loan.principal,
        rate: loan.rate,
        duration: loan.duration,
        status: loan.status,
        interestType: loan.interestType || 'simple',
      });
    }
  }, [loan]);

  if (!loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.put(`/loans/${loan._id}`, formData);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-3 mb-2 p-0 sm:p-0">
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

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 p-0 sm:px-0 sm:pb-0"
        >
          <div className="space-y-4 sm:space-y-5">
            {/* Principal */}
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
                required
                value={formData.principal}
                onChange={(e) =>
                  setFormData({ ...formData, principal: e.target.value })
                }
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Interest Type */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-500" /> Interest Type
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, interestType: 'simple' })
                  }
                  className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border text-xs sm:text-sm font-black transition-all ${
                    formData.interestType === 'simple'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500 ring-2 ring-orange-500/20'
                      : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Simple Interest
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, interestType: 'emi' })
                  }
                  className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border text-xs sm:text-sm font-black transition-all ${
                    formData.interestType === 'emi'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  EMI (Reducing)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Rate */}
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
                  required
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Duration */}
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
                  required
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label
                htmlFor="status"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
              >
                <Activity className="w-3 h-3" /> Agreement Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="w-full px-4 py-2.5 sm:py-3 h-auto rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={loading}
              variant="gradient"
              className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
            >
              Confirm Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditLoanModal;
