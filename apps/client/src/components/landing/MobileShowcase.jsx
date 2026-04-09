import { motion } from 'framer-motion';
import { Smartphone, Activity } from 'lucide-react';

const MobileShowcase = () => {
  return (
    <section className="py-24 px-6 bg-slate-50 dark:bg-[#04081d] relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/10 rounded-full blur-[100px]" />
            <motion.div
              initial={{ opacity: 0, rotateY: 20 }}
              whileInView={{ opacity: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative z-10"
            >
              <img
                src="https://res.cloudinary.com/dzfcf4sqf/image/upload/q_auto/f_auto/v1775537326/Group_7_rmltxb.png"
                alt="Mobile Analytics"
                loading="lazy"
                className="w-full max-w-[320px] mx-auto rotate-[-5deg] hover:rotate-0 transition-transform duration-700"
              />
            </motion.div>
          </div>
          <div className="space-y-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
              Seamless Mobility
            </h2>
            <h3 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none dark:text-white">
              The Member <br />{' '}
              <span className="italic text-indigo-500">Ecosystem.</span>
            </h3>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">
              Financial autonomy for every borrower and investor. Our mobile
              portal delivers real-time portfolio tracking, P2P fund transfers,
              and sub-second loan requests with high-performance infinite scroll
              for an uninterrupted experience.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                <Smartphone className="w-6 h-6 text-primary mb-3" />
                <p className="font-black text-xs uppercase tracking-widest dark:text-white">
                  Native Performance
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
                <Activity className="w-6 h-6 text-emerald-500 mb-3" />
                <p className="font-black text-xs uppercase tracking-widest dark:text-white">
                  Real-Time Sync
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileShowcase;
