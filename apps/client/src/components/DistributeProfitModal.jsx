import { useState } from 'react';
import { Loader2, TrendingUp, Calendar, FileText, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DistributeProfitModal = ({
  isOpen,
  onClose,
  onSuccess,
  type = 'regular',
}) => {
  const isShareDist = type === 'share';
  const [formData, setFormData] = useState({
    totalProfit: '',
    period: new Date().toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    }),
    description: '',
    useCustomRates: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData({
      ...formData,
      [name]: inputType === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isShareDist
        ? '/members/distribute-share-profit'
        : '/members/distribute-profit';
      const response = await api.post(endpoint, {
        ...formData,
        totalProfit: parseFloat(formData.totalProfit) || 0,
      });

      toast.success(response.data.message || 'Profit distributed successfully');

      if (onSuccess) onSuccess();
      onClose();

      // Reset form (except period)
      setFormData({
        ...formData,
        totalProfit: '',
        description: '',
        useCustomRates: false,
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to distribute profit';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`p-3 rounded-2xl ${isShareDist ? 'bg-indigo-500/10 text-indigo-500' : 'bg-primary/10 text-primary'}`}
            >
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">
                {isShareDist ? 'Distribute Share Profit' : 'Distribute Profit'}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                {isShareDist
                  ? 'Distribute earnings to business share holders.'
                  : 'Share earnings with active regular members.'}
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
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <TrendingUp
                  className={`w-3 h-3 ${isShareDist ? 'text-indigo-500' : 'text-emerald-500'}`}
                />{' '}
                Total Profit to Distribute *
              </label>
              <input
                type="number"
                name="totalProfit"
                value={formData.totalProfit}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                placeholder="Rs. 0.00"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Calendar className="w-3 h-3 text-primary" /> Distribution
                Period
              </label>
              <input
                type="text"
                name="period"
                value={formData.period}
                onChange={handleChange}
                required
                placeholder="e.g. Feb 2026"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <FileText className="w-3 h-3" /> Description / Notes
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter details about this distribution..."
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
              />
            </div>

            {!isShareDist && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/50 group cursor-pointer transition-colors hover:bg-muted/50">
                <div className="flex-1">
                  <label
                    htmlFor="useCustomRates"
                    className="text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Use Custom Rates
                  </label>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Calculate based on individual member profit rates instead of
                    proportional share.
                  </p>
                </div>
                <input
                  id="useCustomRates"
                  type="checkbox"
                  name="useCustomRates"
                  checked={formData.useCustomRates}
                  onChange={handleChange}
                  className="w-5 h-5 rounded-lg border-border/50 bg-background transition-all accent-primary cursor-pointer"
                />
              </div>
            )}
            {isShareDist && (
              <p className="text-[10px] text-muted-foreground/60 italic px-1">
                * Share profit is always distributed proportionally based on
                active share holdings.
              </p>
            )}
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
              variant={isShareDist ? 'outline' : 'gradient'}
              className={`px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 ${isShareDist ? 'border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white' : ''}`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Percent size={16} />
              )}
              {isShareDist ? 'Distribute Share Profit' : 'Distribute Profit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DistributeProfitModal;
