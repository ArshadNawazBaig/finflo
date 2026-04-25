import { motion } from 'framer-motion';
import { Smartphone, Activity, Wifi, Bell } from 'lucide-react';

const capabilities = [
  {
    icon: Smartphone,
    title: 'Native Performance',
    description: 'Buttery-smooth 60fps on every device',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Activity,
    title: 'Real-Time Sync',
    description: 'Live WebSocket-driven updates',
    color: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    icon: Wifi,
    title: 'Offline Ready',
    description: 'Full functionality without connection',
    color: 'text-violet-500 bg-violet-500/10',
  },
  {
    icon: Bell,
    title: 'Push Alerts',
    description: 'Instant notification delivery',
    color: 'text-amber-500 bg-amber-500/10',
  },
];

const MobileShowcase = () => {
  return (
    <section className="py-28 lg:py-36 px-6 bg-white dark:bg-[#020617] relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Phone mockup */}
          <div className="relative group order-2 lg:order-1">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-primary/[0.06] rounded-full blur-[80px] group-hover:bg-primary/[0.1] transition-colors duration-700" />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10"
            >
              <img
                src="https://res.cloudinary.com/dzfcf4sqf/image/upload/q_auto/f_auto/v1775537326/Group_7_rmltxb.png"
                alt="Mobile Analytics"
                loading="lazy"
                className="w-full max-w-[300px] mx-auto transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </motion.div>
          </div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8 order-1 lg:order-2"
          >
            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Seamless Mobility
              </p>
              <h2 className="text-4xl lg:text-[3.5rem] font-extrabold tracking-[-0.035em] leading-[0.95] text-slate-900 dark:text-white">
                The member{' '}
                <span className="text-gradient-primary">
                  ecosystem
                </span>
              </h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-lg">
                Financial autonomy for every borrower and investor. Real-time
                portfolio tracking, P2P fund transfers, and sub-second loan
                requests with infinite scroll.
              </p>
            </div>

            {/* Capability cards */}
            <div className="grid grid-cols-2 gap-3">
              {capabilities.map((cap, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08, duration: 0.5 }}
                  className="group/card p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] hover:border-slate-200 dark:hover:border-white/[0.1] hover:shadow-sm transition-all duration-300"
                >
                  <div className={`w-8 h-8 rounded-lg ${cap.color} flex items-center justify-center mb-3`}>
                    <cap.icon size={15} strokeWidth={2.5} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">
                    {cap.title}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                    {cap.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MobileShowcase;
