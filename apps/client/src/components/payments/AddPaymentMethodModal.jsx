import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CreditCard, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';

const AddPaymentMethodModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
    isDefault: false,
  });

  const detectCardBrand = (number) => {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'Amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    return 'Card';
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16 && /^\d*$/.test(value)) {
      setFormData({ ...formData, cardNumber: formatCardNumber(value) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleaned = formData.cardNumber.replace(/\s/g, '');
      const brand = detectCardBrand(cleaned);
      const last4 = cleaned.slice(-4);

      await api.post('/subscription/payment-method', {
        brand,
        last4,
        expiryMonth: parseInt(formData.expiryMonth),
        expiryYear: parseInt(formData.expiryYear),
        isDefault: formData.isDefault,
      });

      toast.success('Payment method added successfully');
      onSuccess();
      onClose();
      setFormData({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardholderName: '',
        isDefault: false,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to add payment method',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <CreditCard />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                Payment Method
              </p>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription className="mt-1">
                Add a new card to your account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label={
              <>
                <CreditCard className="w-3 h-3" /> Card Number
              </>
            }
            htmlFor="cardNumber"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
          >
            <Input
              id="cardNumber"
              type="text"
              required
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={handleCardNumberChange}
              className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField
              label="Month"
              htmlFor="expiryMonth"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <Input
                id="expiryMonth"
                type="number"
                required
                placeholder="MM"
                min="1"
                max="12"
                value={formData.expiryMonth}
                onChange={(e) =>
                  setFormData({ ...formData, expiryMonth: e.target.value })
                }
                className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </FormField>
            <FormField
              label="Year"
              htmlFor="expiryYear"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <Input
                id="expiryYear"
                type="number"
                required
                placeholder="YYYY"
                min="2026"
                max="2050"
                value={formData.expiryYear}
                onChange={(e) =>
                  setFormData({ ...formData, expiryYear: e.target.value })
                }
                className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </FormField>
            <FormField
              label="CVV"
              htmlFor="cvv"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <Input
                id="cvv"
                type="text"
                required
                placeholder="123"
                maxLength="4"
                value={formData.cvv}
                onChange={(e) =>
                  /^\d*$/.test(e.target.value) &&
                  setFormData({ ...formData, cvv: e.target.value })
                }
                className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </FormField>
          </div>

          <FormField
            label="Cardholder Name"
            htmlFor="cardholderName"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
          >
            <Input
              id="cardholderName"
              type="text"
              required
              placeholder="John Doe"
              value={formData.cardholderName}
              onChange={(e) =>
                setFormData({ ...formData, cardholderName: e.target.value })
              }
              className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </FormField>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-200 text-primary focus:ring-primary/20"
            />
            <label
              htmlFor="isDefault"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Set as default payment method
            </label>
          </div>

          <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Add Card
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentMethodModal;
