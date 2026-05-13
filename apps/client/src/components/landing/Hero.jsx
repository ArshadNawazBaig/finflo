import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import HeroDashboardMock from './HeroProductStack';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';

const Hero = () => {
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative">
      <div className="relative">
        {/* === Full-bleed stage — brand gradient (light) / slate-950 (dark) === */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-violet-600 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 px-5 sm:px-10 lg:px-16 pt-28 sm:pt-32 lg:pt-40 pb-0">
          {/* Decorative bokeh — light mode only */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl pointer-events-none dark:hidden" />
          <div className="absolute -bottom-40 -left-32 w-[600px] h-[600px] rounded-full bg-violet-300/15 blur-3xl pointer-events-none dark:hidden" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-white/[0.04] blur-3xl pointer-events-none dark:hidden" />

          {/* Dark-mode subtle indigo radial glow — matches Workbench section */}
          <div
            className="hidden dark:block absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.10), transparent 70%)',
            }}
          />

          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Centered content */}
          <motion.div
            className="relative z-10 max-w-3xl mx-auto text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Announcement pill */}
            <motion.div variants={itemVariants} className="flex justify-center mb-7">
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl">
                <span className="px-2.5 py-1 rounded-full bg-white text-primary text-[10px] font-black uppercase tracking-wider">
                  New
                </span>
                <span className="text-xs font-medium text-white/90">
                  Atomic Engine 3.0 is live
                </span>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-[2.4rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold tracking-[-0.035em] leading-[1.02] text-white mb-6"
            >
              Empowering You to
              <br className="hidden sm:block" /> Save and Spend Wisely
            </motion.h1>

            {/* Subhead */}
            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-base lg:text-lg text-white/75 font-normal max-w-2xl mx-auto leading-relaxed mb-9"
            >
              Finflo brings every part of your financial life into one place —
              manage loans, savings, transfers, and investments with the
              clarity and confidence of a modern bank.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              {IS_LANDING_DOMAIN && !IS_DEV ? (
                <a
                  href={getAppUrl('/register')}
                  className="group inline-flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  Get started free
                  <span className="ml-1 w-6 h-6 rounded-full bg-white text-slate-900 dark:text-primary flex items-center justify-center">
                    <ArrowRight size={12} strokeWidth={3} />
                  </span>
                </a>
              ) : (
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  Get started free
                  <span className="ml-1 w-6 h-6 rounded-full bg-white text-slate-900 dark:text-primary flex items-center justify-center">
                    <ArrowRight size={12} strokeWidth={3} />
                  </span>
                </Link>
              )}
              {IS_LANDING_DOMAIN && !IS_DEV ? (
                <a
                  href={getAppUrl('/documentation')}
                  className="inline-flex items-center gap-2 text-white/90 hover:text-white px-3 py-3 text-sm font-semibold transition-colors"
                >
                  <Play size={13} fill="currentColor" />
                  View documentation
                </a>
              ) : (
                <Link
                  to="/documentation"
                  className="inline-flex items-center gap-2 text-white/90 hover:text-white px-3 py-3 text-sm font-semibold transition-colors"
                >
                  <Play size={13} fill="currentColor" />
                  View documentation
                </Link>
              )}
            </motion.div>
          </motion.div>

          {/* Dashboard mockup — flush with the bottom of the stage */}
          <div className="relative z-10 mt-12 sm:mt-16 lg:mt-20 max-w-6xl mx-auto">
            <HeroDashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
