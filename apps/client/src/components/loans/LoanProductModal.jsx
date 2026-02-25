import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Save } from 'lucide-react';

const LoanProductModal = ({ isOpen, onClose, onSuccess, product }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    interestRate: '',
    duration: '',
    interestType: 'simple',
    minAmount: '',
    maxAmount: '',
    isActive: true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        interestRate: product.interestRate || '',
        duration: product.duration || '',
        interestType: product.interestType || 'simple',
        minAmount: product.minAmount || '',
        maxAmount: product.maxAmount || '',
        isActive: product.isActive !== undefined ? product.isActive : true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        interestRate: '',
        duration: '',
        interestType: 'simple',
        minAmount: '',
        maxAmount: '',
        isActive: true,
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (product) {
        await api.put(`/loan-products/${product._id}`, formData);
        toast.success('Loan product updated successfully');
      } else {
        await api.post('/loan-products', formData);
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
      <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            {product ? 'Edit Loan Product' : 'Create New Product'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Standard 12% Gold Loan"
                required
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Short description of the product"
                className="rounded-xl min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={formData.interestRate}
                  onChange={(e) =>
                    setFormData({ ...formData, interestRate: e.target.value })
                  }
                  placeholder="12"
                  required
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Months)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  placeholder="12"
                  required
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Type</Label>
                <Select
                  value={formData.interestType}
                  onValueChange={(val) =>
                    setFormData({ ...formData, interestType: val })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Interest</SelectItem>
                    <SelectItem value="emi">EMI (Reducing)</SelectItem>
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
                  onClick={() =>
                    setFormData({ ...formData, isActive: !formData.isActive })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${formData.isActive ? 'bg-emerald-500' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`}
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
                  value={formData.minAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minAmount: e.target.value })
                  }
                  placeholder="0"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Max Amount (Optional)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxAmount: e.target.value })
                  }
                  placeholder="100000"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              className="rounded-xl px-8 w-full sm:w-auto flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LoanProductModal;
