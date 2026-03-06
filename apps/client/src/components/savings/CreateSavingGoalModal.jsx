import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Calendar, Tag } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';

const CreateSavingGoalModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      targetAmount: '',
      category: 'other',
      deadline: '',
    },
  });

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      await api.post('/saving-goals', formData, {
        headers: {
          /* Auth header handled by browser cookies */
        },
      });
      toast.success('Goal created successfully!');
      onSuccess();
      onClose();
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 sm:p-10 border-none shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Target size={160} strokeWidth={1} />
        </div>

        <DialogHeader className="relative z-10 mb-8">
          <DialogTitle className="text-3xl font-black tracking-tighter">
            New Saving Goal
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            What are you working towards?
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 relative z-10"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Goal Title
              </Label>
              <input
                type="text"
                placeholder="e.g., New MacBook Pro"
                className="w-full rounded-2xl h-12 bg-muted/30 border border-border/50 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                {...register('title', { required: 'Goal title is required' })}
              />
              {errors.title && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Target Amount (PKR)
              </Label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full rounded-2xl h-12 bg-muted/30 border border-border/50 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-black"
                {...register('targetAmount', {
                  required: 'Target amount is required',
                  min: { value: 1, message: 'Amount must be greater than 0' },
                })}
              />
              {errors.targetAmount && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.targetAmount.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                  <Tag size={10} /> Category
                </Label>
                <Select
                  defaultValue="other"
                  onValueChange={(val) => setValue('category', val)}
                >
                  <SelectTrigger className="rounded-2xl h-12 bg-muted/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-xl">
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="gadget">Gadget</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1">
                  <Calendar size={10} /> Deadline
                </Label>
                <input
                  type="date"
                  className="w-full rounded-2xl h-12 bg-muted/30 border border-border/50 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  style={{ colorScheme: 'auto' }}
                  {...register('deadline')}
                />
              </div>
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
              className="flex-[2] rounded-2xl h-12 font-black uppercase tracking-widest text-xs"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSavingGoalModal;
