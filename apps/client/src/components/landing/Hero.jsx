import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-44 pb-20 px-6 lg:pt-40 lg:pb-28">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-[0.2em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
                Next Gen Infrastructure Released
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white">
                Orchestrate <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-[hsl(var(--btn-gradient-to))] to-[hsl(var(--btn-gradient-from))] italic">
                  Infinite Capital.
                </span>
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
                The world's most sophisticated lending operating system. Built
                for high-growth institutions to automate billion-dollar
                portfolios with cryptographic precision.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(var(--primary),0.4)] hover:shadow-[0_25px_50px_-12px_rgba(var(--primary),0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
              >
                Start Evolution Now
                <ArrowRight size={16} />
              </Link>
              <button className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 text-xs shadow-lg dark:text-white">
                Request Demo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-6 pt-6 opacity-60 grayscale hover:grayscale-0 transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3 text-center sm:text-left">
                  Trusted By Global Leaders
                </span>
                <div className="flex gap-8 items-center overflow-x-auto pb-4 sm:pb-0 scrollbar-hide">
                  <span className="text-lg font-black italic tracking-tighter">
                    FIN-TECH
                  </span>
                  <span className="text-lg font-black tracking-widest">
                    NEXUS
                  </span>
                  <span className="text-lg font-black italic tracking-tight">
                    KREDO
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5 relative h-[400px] lg:h-[600px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="relative z-10 h-full w-full flex items-center justify-center"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-primary/20 rounded-full blur-[140px] dark:bg-primary/10 animate-pulse" />
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 2, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-full max-w-[280px] lg:max-w-[850px] mx-auto"
              >
                <img
                  src="/screenshots/d2.png"
                  alt="LoanMaster Mobile App"
                  loading="eager"
                  className="w-full relative z-20 drop-shadow-[0_0_100px_rgba(var(--primary),0.3)]"
                />
                <motion.div
                  animate={{ x: [0, 10, 0], y: [0, -10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute -top-6 -right-6 lg:-right-12 bg-emerald-500 text-white p-4 rounded-3xl shadow-2xl z-30 hidden sm:block border-4 border-white dark:border-slate-950"
                >
                  <div className="flex flex-col items-center">
                    <CheckCircle2 size={24} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase mt-1">
                      Verified
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
