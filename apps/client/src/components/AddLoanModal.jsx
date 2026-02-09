import { useState, useEffect } from 'react';
import {
  Loader2,
  DollarSign,
  Clock,
  Percent,
  User,
  PlusCircle,
} from 'lucide-react';
import UpgradePrompt from '@/components/UpgradePrompt';
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
import api from '@/lib/axios';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AddLoanModal = ({ isOpen, onClose, onSuccess, initialCustomerId }) => {
  const [formData, setFormData] = useState({
    customerId: initialCustomerId || '',
    principal: '',
    rate: '',
    duration: '',
    startDate: new Date(),
    interestType: 'simple',
  });
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeData, setUpgradeData] = useState({});

  // Fetch customers for the dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchCustomers = async () => {
        try {
          const { data } = await api.get('/customers?limit=100');
          setCustomers(data.data || []);
        } catch (err) {
          console.error('Failed to fetch customers', err);
        }
      };
      fetchCustomers();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submissionData = {
        ...formData,
        startDate: formData.startDate.toISOString().split('T')[0],
      };
      await api.post('/loans', submissionData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        customerId: '',
        principal: '',
        rate: '',
        duration: '',
        startDate: new Date(),
        interestType: 'emi',
      });
    } catch (err) {
      // Check if it's a plan limit error
      if (err.response?.status === 403 && err.response?.data?.upgradeRequired) {
        setUpgradeData({
          plan: err.response.data.plan,
          limit: err.response.data.limit,
          current: err.response.data.current,
          feature: 'loans',
        });
        setShowUpgradePrompt(true);
        setError(''); // Clear error since we're showing upgrade prompt
      } else {
        setError(err.response?.data?.message || 'Failed to create loan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">
                Issue New Loan
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Set up a new lending agreement.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* Customer Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <User className="w-3 h-3" /> Select Borrower
              </label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => {
                  setFormData({ ...formData, customerId: value });
                  setError('');
                }}
                required
              >
                <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interest Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Percent className="w-3 h-3 text-orange-500" /> Interest Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, interestType: 'simple' })
                  }
                  className={`px-4 py-3 rounded-2xl border text-sm font-black transition-all ${
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
                  className={`px-4 py-3 rounded-2xl border text-sm font-black transition-all ${
                    formData.interestType === 'emi'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  EMI (Reducing)
                </button>
              </div>
            </div>

            {/* Principal & Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> Principal
                  (Rs.)
                </label>
                <input
                  name="principal"
                  type="number"
                  placeholder="e.g. 50000"
                  required
                  min="0"
                  value={formData.principal}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Percent className="w-3 h-3 text-indigo-500" /> Interest Rate
                  (%)
                </label>
                <input
                  name="rate"
                  type="number"
                  placeholder="e.g. 15"
                  required
                  min="0"
                  step="0.1"
                  value={formData.rate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            {/* Duration & Start Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Term (Months)
                </label>
                <input
                  name="duration"
                  type="number"
                  placeholder="e.g. 12"
                  required
                  min="1"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Commencement
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate.toISOString().split('T')[0]}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startDate: new Date(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
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
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <PlusCircle size={16} />
              )}
              Create Loan Agreement
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        plan={upgradeData.plan}
        limit={upgradeData.limit}
        current={upgradeData.current}
        feature={upgradeData.feature}
      />
    </Dialog>
  );
};

export default AddLoanModal;
