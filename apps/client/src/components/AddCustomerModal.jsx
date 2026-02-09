import { useState } from 'react';
import { Loader2, UserPlus, Mail, Phone, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';

const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/customers', formData);
      onSuccess();
      onClose();
      setFormData({ name: '', email: '', phone: '', address: '' }); // Reset form
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add customer');
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
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-2xl font-black">
                Add New Customer
              </DialogTitle>
              <DialogDescription className="text-[11px] sm:text-sm font-medium">
                Create a new profile to start lending.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 p-0 sm:px-0 sm:pb-0"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                Full Name
              </label>
              <input
                name="name"
                placeholder="e.g. Arshad Nawaz"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="name@nexus.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  name="phone"
                  placeholder="+92 300 1234567"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Physical Address
              </label>
              <textarea
                name="address"
                placeholder="Enter complete street address..."
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] sm:min-h-[100px] resize-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 sm:gap-3"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Register Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;
