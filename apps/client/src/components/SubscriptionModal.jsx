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
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black">
                Choose Your Plan
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Select the plan that best fits your needs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              onClick={() => setSelectedPlan(plan.name)}
              className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                selectedPlan === plan.name
                  ? 'border-primary bg-primary/5 shadow-xl shadow-primary/20'
                  : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
              } ${plan.popular ? 'ring-2 ring-primary/20' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
                    Popular
                  </span>
                </div>
              )}

              {currentPlan === plan.name && (
                <div className="absolute top-4 right-4">
                  <span className="bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Current
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-black mb-2">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black">${plan.price}</span>
                  <span className="text-muted-foreground text-sm font-medium">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <div className="bg-emerald-500/10 p-0.5 rounded-full shrink-0">
                      <Check
                        size={12}
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

        <div className="flex justify-end gap-3 pt-6 border-t border-border/50 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading || selectedPlan === currentPlan}
            className="bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:brightness-110 px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Zap size={16} />
                {selectedPlan === currentPlan
                  ? 'Current Plan'
                  : `Upgrade to ${selectedPlan}`}
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
