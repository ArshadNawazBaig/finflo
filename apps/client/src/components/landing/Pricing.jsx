import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const Pricing = () => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      features: [
        'Up to 10 loans',
        'Basic reporting',
        'Email support',
        '1 user',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Basic',
      price: '$29',
      features: [
        'Up to 100 loans',
        'Advanced reporting',
        'Priority email support',
        'Up to 3 users',
        'Custom branding',
      ],
      cta: 'Upgrade to Basic',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$49',
      features: [
        'Unlimited loans',
        'Advanced analytics',
        'Priority support',
        'Unlimited users',
        'API access',
        'Custom integrations',
      ],
      cta: 'Upgrade to Pro',
      popular: true,
    },
  ];

  return (
    <section
      id="pricing"
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
          {plans.map((plan, i) => (
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
              )}
            >
              {plan.popular && (
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
              <button
                className={cn(
                  'w-full py-5 rounded-full font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl',
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:shadow-primary/40 hover:brightness-110'
                    : 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:border-primary/50 dark:text-white',
                )}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
