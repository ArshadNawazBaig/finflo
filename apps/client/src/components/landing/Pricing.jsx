import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import useSystemSettings from '@/hooks/useSystemSettings';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';

const Pricing = () => {
  const { settings } = useSystemSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('user');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
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
      cta: plan.name === 'Free' ? 'Get Started' : `Upgrade to ${plan.name}`,
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
      className="py-24 px-6 z-10 relative bg-white dark:bg-[#020617]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Capital Access Plans
          </h2>
          <h3 className="text-4xl lg:text-[4.5rem] font-black tracking-tighter leading-none dark:text-white">
            Scale without <span className="italic text-primary">Limits.</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => {
            const isCurrentPlan =
              isAuthenticated &&
              currentPlan &&
              currentPlan.toLowerCase() === plan.name.toLowerCase();

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'relative p-10 rounded-[3rem] border transition-all duration-700 flex flex-col h-full overflow-hidden group',
                  plan.popular
                    ? 'bg-[#020617] dark:bg-primary/5 text-white border-primary/50 shadow-[0_40px_100px_rgba(99,102,241,0.2)] scale-105 z-20'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 dark:text-white',
                  isCurrentPlan
                    ? 'border-primary shadow-2xl shadow-primary/10'
                    : '',
                )}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10" />
                )}
                <div className="mb-8">
                  <h4 className="text-xl font-black mb-3 tracking-tighter">
                    {plan.name}
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tighter">
                      {plan.price}
                    </span>
                    <span className="text-slate-500 font-black uppercase text-[9px] tracking-widest">
                      /node
                    </span>
                  </div>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-3 text-sm font-medium"
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center',
                          plan.popular
                            ? 'bg-primary text-white'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        <CheckCircle2 size={10} strokeWidth={4} />
                      </div>
                      <span
                        className={
                          plan.popular ? 'text-slate-300' : 'text-slate-500'
                        }
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="w-full py-5 rounded-full font-black uppercase tracking-widest text-[10px] text-center bg-emerald-500/10 text-emerald-500 cursor-default border border-emerald-500/20">
                    Current Plan
                  </div>
                ) : IS_LANDING_DOMAIN && !IS_DEV ? (
                  <a
                    href={getLink(plan.name)}
                    className={cn(
                      'w-full py-5 rounded-full font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl text-center',
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:shadow-primary/40 hover:brightness-110'
                        : 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-primary/50 dark:text-white',
                    )}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    to={getLink(plan.name)}
                    className={cn(
                      'w-full py-5 rounded-full font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl text-center',
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:shadow-primary/40 hover:brightness-110'
                        : 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-primary/50 dark:text-white',
                    )}
                  >
                    {plan.cta}
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
