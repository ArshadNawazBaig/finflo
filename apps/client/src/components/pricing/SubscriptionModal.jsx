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
import { cn } from '@/lib/utils';

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
      price: 40,
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
      price: 100,
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
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <Crown />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                Subscription
              </p>
              <DialogTitle>Choose Your Plan</DialogTitle>
              <DialogDescription className="mt-1">
                Select the plan that best fits your needs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              onClick={() => setSelectedPlan(plan.name)}
              className={cn(
                'relative p-5 rounded-2xl border cursor-pointer transition-all duration-300',
                selectedPlan === plan.name
                  ? 'border-primary bg-primary/[0.04] dark:bg-primary/[0.06] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.25)]'
                  : 'border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:border-primary/40',
              )}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]">
                    Popular
                  </span>
                </div>
              )}

              {currentPlan === plan.name && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600">
                    Current
                  </span>
                </div>
              )}

              <div className="text-center mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">
                  {plan.name} Plan
                </p>
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                    ${plan.price}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
                    /month
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-4">
                {plan.features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} />
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

        <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading || selectedPlan === currentPlan}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
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
