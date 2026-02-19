import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Features = ({ features }) => {
  const navigate = useNavigate();
  return (
    <section
      id="architecture"
      className="py-24 bg-white dark:bg-slate-900/20 px-6 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="max-w-3xl mb-16 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
            Platform Infrastructure
          </h2>
          <h3 className="text-4xl lg:text-[4rem] leading-[0.9] font-black tracking-tighter dark:text-white">
            Built for{' '}
            <span className="text-primary italic">Absolute Scale.</span>
          </h3>
          <p className="text-base text-slate-500 font-medium max-w-lg">
            Engineered with a cloud-native vision, FinFlow offers the most
            resilient backend in the fintech industry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group p-8 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-700 hover:shadow-[0_30px_100px_rgba(99,102,241,0.1)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full pointer-events-none transition-all group-hover:scale-150" />
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl bg-primary/10 text-primary border border-primary/20',
                )}
              >
                {feature.icon}
              </div>
              <h4 className="text-xl font-black mb-3 tracking-tight dark:text-white">
                {feature.title}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {feature.description}
              </p>
              <button
                onClick={() => navigate('/documentation')}
                className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary opacity-50 group-hover:opacity-100 transition-all"
              >
                Read Technical Docs <ArrowRight size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
