import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { CheckCircle2, Gem, Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import PricingSkeleton from '@/components/pricing/PricingSkeleton';
import ContactModal from '@/components/ContactModal';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import useSystemSettings from '@/hooks/useSystemSettings';
import SEO from '@/components/SEO';

const Pricing = () => {
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('');

  useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        const { data } = await api.get('/subscription');
        setCurrentPlan(data.plan || 'Free');
      } catch (error) {
        console.error('Failed to fetch billing info', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBillingInfo();
  }, []);

  const handleUpdatePlan = async (planName) => {
    // If it's the free plan, we might want to handle it differently (e.g., direct API call to downgrade)
    // But typically Stripe handles downgrades via the Portal.
    // For now, let's assume upgrades go to Checkout.
    if (planName === 'Free') {
      toast.info(
        'Please manage your subscription cancellation via the billing portal.',
      );
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/subscription/create-checkout-session', {
        plan: planName,
      });
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to start checkout session');
      }
    } catch (error) {
      console.error('Failed to update plan', error);
      const message =
        error.response?.data?.message ||
        'Failed to initiate subscription update';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const planIcons = {
    Free: <Zap className="w-5 h-5 text-emerald-500" />,
    Basic: <Gem className="w-5 h-5 text-indigo-500" />,
    Pro: <Crown className="w-5 h-5 text-primary" />,
  };

  const planDescriptions = {
    Free: 'Perfect for getting started',
    Basic: 'For growing businesses',
    Pro: 'For established businesses',
  };

  const plans = (settings?.subscriptionPlans || []).map((plan) => {
    const isPro = plan.name === 'Pro';

    const limitFeatures = [
      plan.limits.maxLoans === -1
        ? 'Unlimited loans'
        : `Up to ${plan.limits.maxLoans} loans`,
      plan.limits.maxMembers === -1
        ? 'Unlimited team members'
        : `Up to ${plan.limits.maxMembers} members`,
      plan.limits.maxCustomers === -1
        ? 'Unlimited customers'
        : `Up to ${plan.limits.maxCustomers} customers`,
      plan.limits.maxBranches === -1
        ? 'Unlimited branches'
        : `Up to ${plan.limits.maxBranches} ${plan.limits.maxBranches === 1 ? 'branch' : 'branches'}`,
    ];

    const baseFeatures = (plan.features || []).filter(
      (f) =>
        !f.toLowerCase().includes('loan') &&
        !f.toLowerCase().includes('member') &&
        !f.toLowerCase().includes('customer') &&
        !f.toLowerCase().includes('branch'),
    );

    return {
      name: plan.name,
      price: `$${plan.price}`,
      description:
        plan.description ||
        planDescriptions[plan.name] ||
        'Custom plan features',
      features: [...limitFeatures, ...baseFeatures],
      icon: planIcons[plan.name] || <Zap className="w-5 h-5 text-primary" />,
      buttonText:
        plan.name === 'Free' ? 'Get Started' : `Upgrade to ${plan.name}`,
      buttonClass: isPro ? 'variant-gradient' : 'outline',
      highlight: isPro,
      badge: isPro ? 'Most Popular' : null,
    };
  });

  if ((settingsLoading || loading) && !currentPlan) {
    return <PricingSkeleton />;
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <SEO
        title="Pricing & Plans"
        description="Explore FinFlo pricing plans. From our free starter plan to pro infrastructure for global lending institutions."
        canonical="/pricing"
      />
      <PageHeader
        title={
          <>
            FinFlo <span className="text-primary ">Plans</span>
          </>
        }
        description="Choose the perfect plan to scale your lending operations."
      />

      {settingsLoading || loading ? (
        <PricingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative group p-6 sm:p-10 rounded-[2rem] flex flex-col transition-all duration-300 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] ${
                  plan.highlight
                    ? 'bg-white dark:bg-white/[0.04] border-2 border-primary scale-105 z-10'
                    : 'bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-primary/30'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl z-20">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`p-3 rounded-2xl ${plan.highlight ? 'bg-primary/10' : 'bg-muted'}`}
                    >
                      {plan.icon}
                    </div>
                    <h4 className="text-xl font-bold">{plan.name}</h4>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    {plan.price !== 'Custom' && (
                      <span className="text-muted-foreground font-medium">
                        /mo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 font-medium leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-sm font-medium"
                    >
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-primary' : 'text-emerald-500'}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpdatePlan(plan.name)}
                  disabled={loading || currentPlan === plan.name}
                  variant={
                    plan.buttonClass === 'variant-gradient'
                      ? undefined
                      : 'outline'
                  }
                  className={`w-full py-3.5 rounded-full font-bold text-[13px] ${
                    plan.buttonClass === 'variant-gradient'
                      ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5'
                      : 'border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/40 dark:hover:bg-white/[0.02]'
                  } transition-all duration-300 ${
                    currentPlan === plan.name ? 'opacity-70' : ''
                  }`}
                >
                  {currentPlan === plan.name ? 'Current Plan' : plan.buttonText}
                </Button>
              </div>
            ))}
          </div>

          {/* Comparison Section (Visual Placeholder for depth) */}
          <div className="mt-16 p-6 sm:p-12 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-center space-y-6">
            <h3 className="text-2xl font-bold">Need a custom solution?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto font-medium">
              Whether you're a startup or a global bank, we have the
              infrastructure to support your growth. Our team can help you build
              a tailored lending engine.
            </p>
            <div className="flex justify-center gap-4 pt-4 flex-col sm:flex-row">
              <Link
                to="/documentation"
                className="px-8 py-4 rounded-full border border-slate-100 dark:border-white/[0.06] font-bold text-[12px] hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-all"
              >
                View Documentation
              </Link>
              <Button
                onClick={() => setShowContactModal(true)}
                className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Schedule a Strategy Call
              </Button>
            </div>
          </div>

          <ContactModal
            isOpen={showContactModal}
            onClose={() => setShowContactModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default Pricing;
