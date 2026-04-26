import { motion } from 'framer-motion';
import useSystemSettings from '@/hooks/useSystemSettings';

const TrustedBy = () => {
  const { settings, loading } = useSystemSettings();

  if (loading) return null;

  const activePartners = settings?.partners?.filter(p => p.active) || [];

  if (activePartners.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 border-y border-slate-200/50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center gap-8">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-center">
            Trusted by leading institutions worldwide
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 sm:gap-x-20 group">
            {activePartners.map((partner, idx) => (
              <motion.span 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + (idx * 0.1), duration: 0.5 }}
                className="text-xl sm:text-2xl font-black tracking-tighter text-slate-800 dark:text-white whitespace-nowrap flex items-center gap-2 opacity-50 dark:opacity-40 transition-opacity duration-300 group-hover:opacity-20 hover:!opacity-100 cursor-default"
              >
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt={partner.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-slate-800 dark:bg-white inline-block"></div>
                )}
                {partner.name}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Decorative gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-50 dark:from-[#020617] to-transparent z-10 pointer-events-none hidden md:block" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 dark:from-[#020617] to-transparent z-10 pointer-events-none hidden md:block" />
    </section>
  );
};

export default TrustedBy;
