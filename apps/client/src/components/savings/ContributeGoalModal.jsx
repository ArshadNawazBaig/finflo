import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PiggyBank, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/utils';

const ContributeGoalModal = ({
  isOpen,
  onClose,
  goal,
  onSuccess,
  memberBalance,
}) => {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    if (amount > memberBalance) {
      toast.error('Insufficient balance in your main account');
      return;
    }

    setLoading(true);

    try {
      const memberToken = localStorage.getItem('memberToken');
      await api.post(
        `/saving-goals/${goal._id}/contribute`,
        { amount },
        {
          headers: { Authorization: `Bearer ${memberToken}` },
        },
      );
      toast.success(`Allocated ${formatPKR(amount)} to ${goal.title}`);
      onSuccess();
      onClose();
      setAmount('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to contribute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 sm:p-10 border-none shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl">
        <DialogHeader className="relative z-10 mb-8">
          <DialogTitle className="text-3xl font-black tracking-tighter">
            Allocate Funds
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            Add money to your "{goal?.title}" goal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-primary">
                <PiggyBank size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  Available Balance
                </p>
                <p className="font-black tracking-tight">
                  {formatPKR(memberBalance)}
                </p>
              </div>
            </div>
            <ArrowRight className="text-muted-foreground/30" />
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">
                Target Progress
              </p>
              <p className="font-black tracking-tight text-primary">
                {goal?.progress}%
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Contribution Amount (PKR)
              </Label>
              <Input
                required
                type="number"
                placeholder="Enter amount to save..."
                className="rounded-2xl h-14 bg-muted/30 border-none focus-visible:ring-primary/20 text-xl font-black tracking-tighter"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-[2] rounded-2xl h-14 font-black uppercase tracking-widest text-xs"
              disabled={loading || !amount}
            >
              {loading ? 'Processing...' : 'Allocate Funds'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContributeGoalModal;
