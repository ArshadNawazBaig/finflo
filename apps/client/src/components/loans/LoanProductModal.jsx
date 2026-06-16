import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Package } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[500px] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Package />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
              {product ? 'Edit Product' : 'New Product'}
            </p>
            <DialogTitle>
              {product ? 'Edit Loan Product' : 'Create New Product'}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Configure standardized terms for loan issuance.
            </DialogDescription>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          <form
            id="loan-product-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                Product Name
              </Label>
              <Input
                id="name"
                placeholder="e.g., Standard 12% Gold Loan"
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('name', { required: 'Product name is required' })}
              />
              {errors.name && (
                <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="description"
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
              >
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Short description of the product"
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px]"
                {...register('description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="interestRate"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Interest Rate (%)
                </Label>
                <Input
                  id="interestRate"
                  type="number"
                  placeholder="12"
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('interestRate', {
                    required: 'Interest rate is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                />
                {errors.interestRate && (
                  <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.interestRate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="duration"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Duration (Months)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="12"
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Interest Type
                </Label>
                <Select
                  value={interestType}
                  onValueChange={(val) => setInterestType(val)}
                >
                  <SelectTrigger className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Interest</SelectItem>
                    <SelectItem value="emi">EMI (Reducing)</SelectItem>
                    <SelectItem value="compound">Compound Interest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                <Label
                  htmlFor="isActive"
                  className="cursor-pointer text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Active Status
                </Label>
                <Button
                  variant="ghost"
                  type="button"
                  id="isActive"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/[0.1]'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="minAmount"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Min Amount (Optional)
                </Label>
                <Input
                  id="minAmount"
                  type="number"
                  placeholder="0"
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('minAmount')}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="maxAmount"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                >
                  Max Amount (Optional)
                </Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="100000"
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('maxAmount')}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            form="loan-product-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            {product ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanProductModal;
