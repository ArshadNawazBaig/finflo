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
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">
                Add Payment Method
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Add a new card to your account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Card Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <CreditCard className="w-3 h-3" /> Card Number
              </label>
              <input
                type="text"
                required
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Expiry & CVV */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Month
                </label>
                <input
                  type="number"
                  required
                  placeholder="MM"
                  min="1"
                  max="12"
                  value={formData.expiryMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryMonth: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Year
                </label>
                <input
                  type="number"
                  required
                  placeholder="YYYY"
                  min="2026"
                  max="2050"
                  value={formData.expiryYear}
                  onChange={(e) =>
                    setFormData({ ...formData, expiryYear: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  CVV
                </label>
                <input
                  type="text"
                  required
                  placeholder="123"
                  maxLength="4"
                  value={formData.cvv}
                  onChange={(e) =>
                    /^\d*$/.test(e.target.value) &&
                    setFormData({ ...formData, cvv: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Cardholder Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Cardholder Name
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={(e) =>
                  setFormData({ ...formData, cardholderName: e.target.value })
                }
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Set as Default */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/30">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary/20"
              />
              <label
                htmlFor="isDefault"
                className="text-sm font-medium cursor-pointer"
              >
                Set as default payment method
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
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
