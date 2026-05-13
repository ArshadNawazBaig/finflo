import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/axios';
import { toast } from 'sonner';

const LoanProductModal = ({ isOpen, onClose, onSuccess, product }) => {
  const [loading, setLoading] = useState(false);
  const [interestType, setInterestType] = useState('simple');
  const [isActive, setIsActive] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      interestRate: '',
      duration: '',
      minAmount: '',
      maxAmount: '',
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || '',
        description: product.description || '',
        interestRate: product.interestRate || '',
        duration: product.duration || '',
        minAmount: product.minAmount || '',
        maxAmount: product.maxAmount || '',
      });
      setInterestType(product.interestType || 'simple');
      setIsActive(product.isActive !== undefined ? product.isActive : true);
    } else {
      reset({
        name: '',
        description: '',
        interestRate: '',
        duration: '',
        minAmount: '',
        maxAmount: '',
      });
      setInterestType('simple');
      setIsActive(true);
    }
  }, [product, isOpen, reset]);

  const onSubmit = async (formData) => {
    try {
      setLoading(true);
      const payload = { ...formData, interestType, isActive };
      if (product) {
        await api.put(`/loan-products/${product._id}`, payload);
        toast.success('Loan product updated successfully');
      } else {
        await api.post('/loan-products', payload);
        toast.success('Loan product created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save loan product:', error);
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {product ? 'Edit Loan Product' : 'Create New Product'}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form
            id="loan-product-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="e.g., Standard 12% Gold Loan"
                className="rounded-xl"
                {...register('name', { required: 'Product name is required' })}
              />
              {errors.name && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Short description of the product"
                className="rounded-xl min-h-[80px]"
                {...register('description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  placeholder="12"
                  className="rounded-xl"
                  {...register('interestRate', {
                    required: 'Interest rate is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                />
                {errors.interestRate && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.interestRate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Months)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="12"
                  className="rounded-xl"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Type</Label>
                <Select
                  value={interestType}
                  onValueChange={(val) => setInterestType(val)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Interest</SelectItem>
                    <SelectItem value="emi">EMI (Reducing)</SelectItem>
                    <SelectItem value="compound">Compound Interest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20">
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active Status
                </Label>
                <button
                  type="button"
                  id="isActive"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Min Amount (Optional)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  placeholder="0"
                  className="rounded-xl"
                  {...register('minAmount')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Max Amount (Optional)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="100000"
                  className="rounded-xl"
                  {...register('maxAmount')}
                />
              </div>
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
            form="loan-product-form"
            type="submit"
            isLoading={loading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest"
          >
            {product ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanProductModal;
