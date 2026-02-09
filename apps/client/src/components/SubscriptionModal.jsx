import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Check, Zap, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';

const SubscriptionModal = ({ isOpen, onClose, currentPlan, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan || 'Free');

  const plans = [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for getting started',
      features: [
        'Up to 10 loans',
        'Basic reporting',
        'Email support',
        '1 user',
      ],
    },
    {
      name: 'Basic',
      price: 29,
      description: 'For growing businesses',
      features: [
        'Up to 100 loans',
        'Advanced reporting',
        'Priority email support',
        'Up to 3 users',
        'Custom branding',
      ],
    },
    {
      name: 'Pro',
      price: 49,
      description: 'For established businesses',
      features: [
        'Unlimited loans',
        'Advanced analytics',
        'Priority support',
        'Unlimited users',
        'API access',
        'Custom integrations',
      ],
      popular: true,
    },
  ];

  const handleUpgrade = async () => {
    if (selectedPlan === currentPlan) {
      toast.info('You are already on this plan');
      return;
    }

    setLoading(true);
    try {
      await api.put('/subscription', { plan: selectedPlan });
      toast.success(`Successfully upgraded to ${selectedPlan} plan!`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update subscription',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-0 sm:p-0">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 p-0 sm:p-0">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shrink-0">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-2xl font-black">
                Choose Your Plan
              </DialogTitle>
              <DialogDescription className="text-[11px] sm:text-sm font-medium">
                Select the plan that best fits your needs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-2 sm:mt-6 p-0 sm:px-0">
          {plans.map((plan) => (
            <div
              key={plan.name}
              onClick={() => setSelectedPlan(plan.name)}
              className={`relative p-5 sm:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                selectedPlan === plan.name
                  ? 'border-primary bg-primary/5 shadow-xl shadow-primary/20'
                  : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
              } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-indigo-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-0.5 sm:py-1 rounded-full shadow-lg">
                    Popular
                  </span>
                </div>
              )}

              {currentPlan === plan.name && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <span className="bg-emerald-500/10 text-emerald-600 text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
                    Current
                  </span>
                </div>
              )}

              <div className="text-center mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-black mb-1 sm:mb-2">
                  {plan.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-black">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground text-xs sm:text-sm font-medium">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-[11px] sm:text-sm font-medium"
                  >
                    <div className="bg-emerald-500/10 p-0.5 rounded-full shrink-0">
                      <Check
                        size={10}
                        className="text-emerald-600"
                        strokeWidth={3}
                      />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {selectedPlan === plan.name && (
                <div className="absolute inset-0 rounded-2xl border-2 border-primary pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border/50 mt-6 p-0 pb-0 sm:px-0 sm:pb-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            onClick={handleUpgrade}
            disabled={loading || selectedPlan === currentPlan}
            variant="gradient"
            className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Zap size={14} />
                {selectedPlan === currentPlan
                  ? 'Current'
                  : `Upgrade to ${selectedPlan}`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
