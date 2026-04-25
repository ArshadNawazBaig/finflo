import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Features = ({ features }) => {
  const navigate = useNavigate();

  // Color configs per feature
  const colorConfigs = [
    { gradient: 'from-blue-500/20 to-cyan-500/10', border: 'hover:border-blue-500/30', iconBg: 'bg-blue-500', glow: 'bg-blue-500/30' },
    { gradient: 'from-emerald-500/20 to-teal-500/10', border: 'hover:border-emerald-500/30', iconBg: 'bg-emerald-500', glow: 'bg-emerald-500/30' },
    { gradient: 'from-rose-500/20 to-pink-500/10', border: 'hover:border-rose-500/30', iconBg: 'bg-rose-500', glow: 'bg-rose-500/30' },
    { gradient: 'from-indigo-500/20 to-violet-500/10', border: 'hover:border-indigo-500/30', iconBg: 'bg-indigo-500', glow: 'bg-indigo-500/30' },
    { gradient: 'from-amber-500/20 to-orange-500/10', border: 'hover:border-amber-500/30', iconBg: 'bg-amber-500', glow: 'bg-amber-500/30' },
    { gradient: 'from-cyan-500/20 to-blue-500/10', border: 'hover:border-cyan-500/30', iconBg: 'bg-cyan-500', glow: 'bg-cyan-500/30' },
  ];

  return (
    <section
      id="architecture"
      className="py-28 lg:py-36 bg-white dark:bg-[#020617] px-6 relative overflow-hidden"
    >
      {/* Background accents */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-20 space-y-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Platform Infrastructure
          </p>
          <h2 className="text-4xl lg:text-[3.5rem] font-extrabold tracking-[-0.035em] leading-[0.95] text-slate-900 dark:text-white">
            Built for absolute{' '}
            <span className="text-gradient-primary">
              scale
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
            Cloud-native architecture engineered for the most resilient
            financial infrastructure in the industry.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {features.map((feature, idx) => {
            const config = colorConfigs[idx] || colorConfigs[0];
            // First two cards span more height on large screens
            const isLarge = idx < 2;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: idx * 0.08,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={cn(
                  'group relative cursor-pointer',
                  isLarge && 'lg:row-span-1',
                )}
                onClick={() => navigate('/documentation')}
              >
                <div
                  className={cn(
                    'relative h-full rounded-2xl overflow-hidden transition-all duration-500',
                    'bg-slate-50 dark:bg-white/[0.02]',
                    'border border-slate-100 dark:border-white/[0.05]',
                    config.border,
                    'dark:hover:border-white/[0.12]',
                  )}
                >
                  {/* Gradient background on hover */}
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700',
                      config.gradient,
                    )}
                  />

                  {/* Glow spot */}
                  <div
                    className={cn(
                      'absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-60 transition-opacity duration-700',
                      config.glow,
                    )}
                  />

                  {/* Content */}
                  <div className="relative z-10 p-7 lg:p-8 flex flex-col h-full">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center mb-6',
                        config.iconBg,
                        'shadow-lg',
                        '[&>svg]:!w-5 [&>svg]:!h-5 [&>svg]:!text-white',
                      )}
                    >
                      {feature.icon}
                    </div>

                    {/* Text */}
                    <div className="flex-1 space-y-2.5">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="text-[15px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed line-clamp-2">
                        {feature.description}
                      </p>
                    </div>

                    {/* Arrow link */}
                    <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      Learn more
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Bottom border accent on hover */}
                  <div
                    className={cn(
                      'absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                      `bg-gradient-to-r ${config.gradient}`,
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
