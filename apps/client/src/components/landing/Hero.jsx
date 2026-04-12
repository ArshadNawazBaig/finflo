import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import LoanCalculator from './LoanCalculator';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center py-36 lg:py-0 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full lg:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 space-y-8 text-left flex flex-col items-start">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                </span>
                Banking Engine 3.0: Atomic & Redundant
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white">
                Scale Your <br />
                <span className="text-primary italic">Lending Empire.</span>
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 font-medium max-w-lg leading-relaxed">
                The world's most sophisticated lending operating system. Now
                powered by <strong className="text-slate-900 dark:text-white">Atomic Idempotent Operations</strong> for 100% financial
                integrity and full <strong className="text-slate-900 dark:text-white">White-Label Custom Branding</strong>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-start"
            >
              {(IS_LANDING_DOMAIN && !IS_DEV) ? (
                <a
                  href={getAppUrl('/register')}
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(var(--primary),0.4)] hover:shadow-[0_25px_50px_-12px_rgba(var(--primary),0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
                >
                  Start Evolution Now
                  <ArrowRight size={16} />
                </a>
              ) : (
                <Link
                  to="/register"
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(var(--primary),0.4)] hover:shadow-[0_25px_50px_-12px_rgba(var(--primary),0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
                >
                  Start Evolution Now
                  <ArrowRight size={16} />
                </Link>
              )}
              {(IS_LANDING_DOMAIN && !IS_DEV) ? (
                <a
                  href={getAppUrl('/documentation')}
                  className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 text-xs shadow-lg dark:text-white flex items-center justify-center"
                >
                  Read Technical Docs
                </a>
              ) : (
                <Link
                  to="/documentation"
                  className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 text-xs shadow-lg dark:text-white flex items-center justify-center"
                >
                  Read Technical Docs
                </Link>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center md:justify-start gap-6 pt-6 opacity-60 grayscale hover:grayscale-0 transition-all w-full"
            >
              <div className="flex flex-col items-center text-center md:text-left md:items-start">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">
                  Our Subsidiaries
                </span>
                <div className="flex gap-12 items-center overflow-x-auto pb-4 sm:pb-0 scrollbar-hide">
                  <span className="text-lg font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">
                    NORTHSPEX
                  </span>
                  <span className="text-lg font-black italic tracking-tighter text-slate-900 dark:text-white uppercase">
                    CALIBREON
                  </span>
                  <span className="text-lg font-black italic text-slate-900 dark:text-white uppercase">
                    MICRO LOANS.
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5 relative w-full flex items-center justify-center">
            <LoanCalculator />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
