import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import useSystemSettings from '@/hooks/useSystemSettings';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';
import { Button } from '@/components/ui/button';

const Pricing = ({ onContactClick }) => {
  const { settings } = useSystemSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('user');
    const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
    setIsAuthenticated(!!token);
    if (token && user.plan) {
      setCurrentPlan(user.plan);
    }
  }, []);

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
    ];

    const baseFeatures = (plan.features || []).filter(
      (f) =>
        !f.toLowerCase().includes('loan') &&
        !f.toLowerCase().includes('member') &&
        !f.toLowerCase().includes('customer'),
    );

    return {
      name: plan.name,
      price: `$${plan.price}`,
      description: plan.description || '',
      features: [...limitFeatures, ...baseFeatures],
      cta: plan.name === 'Free' ? 'Get started' : `Upgrade to ${plan.name}`,
      popular: isPro,
    };
  });

  if (!settings) return null;

  const getLink = (planName) => {
    const path = isAuthenticated ? '/pricing' : `/login?redirect=/pricing`;
    if (IS_LANDING_DOMAIN && !IS_DEV) {
      return getAppUrl(path);
    }
    return path;
  };

  return (
    <section
      id="scale"
      className="py-28 lg:py-36 px-6 z-10 relative bg-white dark:bg-[#020617]"
    >
      {/* Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.04),transparent_70%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20 space-y-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Simple Pricing
          </p>
          <h2 className="text-4xl lg:text-[3.5rem] font-extrabold tracking-[-0.035em] leading-[0.95] text-slate-900 dark:text-white">
            Scale without{' '}
            <span className="text-gradient-primary">
              limits
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Choose the plan that fits your institution. Upgrade anytime.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const isCurrentPlan =
              isAuthenticated &&
              currentPlan &&
              currentPlan.toLowerCase() === plan.name.toLowerCase();

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'relative p-8 rounded-2xl border transition-all duration-500 flex flex-col h-full group',
                  plan.popular
                    ? 'bg-slate-950 dark:bg-primary/[0.06] text-white border-slate-800 dark:border-primary/20 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.25)] scale-[1.02] z-20'
                    : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] dark:text-white hover:border-slate-200 dark:hover:border-white/[0.1]',
                  isCurrentPlan && 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-slate-950',
                )}
              >
                {/* Popular badge */}
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-white text-[10px] font-semibold uppercase tracking-wider shadow-lg shadow-primary/30">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan details */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 tracking-tight">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight">
                      {plan.price}
                    </span>
                    <span className={cn(
                      'text-sm font-normal',
                      plan.popular ? 'text-slate-400' : 'text-slate-400',
                    )}>
                      /month
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className={cn(
                  'h-px w-full mb-6',
                  plan.popular ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/[0.05]',
                )} />

                {/* Features */}
                <ul className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                          plan.popular
                            ? 'bg-primary/20 text-primary'
                            : 'bg-primary/8 text-primary',
                        )}
                      >
                        <Check size={9} strokeWidth={3} />
                      </div>
                      <span
                        className={cn(
                          'font-normal leading-relaxed',
                          plan.popular
                            ? 'text-slate-300'
                            : 'text-slate-500 dark:text-slate-400',
                        )}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <div className="w-full py-3.5 rounded-xl font-medium text-sm text-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default">
                    Current Plan
                  </div>
                ) : IS_LANDING_DOMAIN && !IS_DEV ? (
                  <Button
                    variant="ghost"
                    onClick={onContactClick}
                    className={cn(
                      'w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-300 text-center flex items-center justify-center gap-2 group/btn',
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                        : 'bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 text-slate-700 dark:text-white',
                    )}
                  >
                    Contact us
                    <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                ) : (
                  <Link
                    to={getLink(plan.name)}
                    className={cn(
                      'w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-300 text-center flex items-center justify-center gap-2 group/btn',
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                        : 'bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/15 text-slate-700 dark:text-white',
                    )}
                  >
                    {plan.cta}
                    <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
