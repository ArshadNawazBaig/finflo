import { useState, useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Globe,
  TrendingUp,
  Shield,
  Zap,
  ChevronRight,
} from 'lucide-react';
import LoanCalculator from './LoanCalculator';
import { getAppUrl, IS_LANDING_DOMAIN, IS_DEV } from '@/lib/constants';

// Animated counter component
const AnimatedCounter = ({
  target,
  suffix = '',
  prefix = '',
  duration = 2,
}) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const end = target;
          const incrementTime = (duration * 1000) / end;
          const step = Math.max(1, Math.floor(end / 60));

          const timer = setInterval(() => {
            start += step;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(start);
            }
          }, incrementTime * step);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

// Floating metric card
const MetricCard = ({ icon: Icon, label, value, delay, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className="group relative"
  >
    <div
      className={`
      relative overflow-hidden rounded-2xl
      bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl
      border border-white/80 dark:border-white/[0.06]
      px-3 py-3 
      shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]
      dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)]
      hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)]
      dark:hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]
      transition-all duration-500 hover:-translate-y-0.5
    `}
    >
      {/* Subtle shimmer on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] duration-1000" />

      <div className="flex items-center gap-2.5">
        <div
          className={`
          w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${color === 'blue' ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400' : ''}
          ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400' : ''}
          ${color === 'violet' ? 'bg-violet-500/10 text-violet-500 dark:bg-violet-500/15 dark:text-violet-400' : ''}
          ${color === 'amber' ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400' : ''}
        `}
        >
          <Icon size={16} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-none mb-1">
            {label}
          </p>
          <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
            {value}
          </p>
        </div>
      </div>
    </div>
  </motion.div>
);

// Minimalist geometric sweep lines
const GeometricSweeps = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    {/* Fixed background geometric stripes */}
    <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" 
         style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 40px)' }} />
    
    {/* Sweeping diagonal line 1 */}
    <motion.div
      className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_10px_rgba(var(--primary),0.5)]"
      style={{ top: '0%', left: '-50%', transformOrigin: 'center' }}
      animate={{ 
        rotate: [35, 35],
        y: ['-100vh', '150vh'],
        opacity: [0, 1, 0]
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
    />
    
    {/* Sweeping diagonal line 2 */}
    <motion.div
      className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent shadow-[0_0_10px_rgba(139,92,246,0.5)]"
      style={{ top: '0%', left: '-50%', transformOrigin: 'center' }}
      animate={{ 
        rotate: [35, 35],
        y: ['-100vh', '150vh'],
        opacity: [0, 1, 0]
      }}
      transition={{ duration: 14, repeat: Infinity, ease: "linear", delay: 4 }}
    />

    {/* Sweeping reverse diagonal line */}
    <motion.div
      className="absolute w-[200%] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.5)]"
      style={{ top: '0%', left: '-50%', transformOrigin: 'center' }}
      animate={{ 
        rotate: [-35, -35],
        y: ['150vh', '-100vh'],
        opacity: [0, 1, 0]
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 2 }}
    />
  </div>
);

const Hero = () => {
  const [activeWord, setActiveWord] = useState(0);
  const words = ['Lending', 'Banking', 'Finance'];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Stagger animation orchestration
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0.01, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 lg:pt-0 lg:pb-0 px-6 overflow-hidden">
      {/* === PREMIUM BACKGROUND SYSTEM === */}

      <GeometricSweeps />

      {/* Subtle dot grid overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top gradient fade (for nav blend) */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-50 dark:from-[#020617] to-transparent z-[2]" />

      {/* === MAIN CONTENT === */}
      <div className="max-w-7xl mx-auto w-full relative z-10 lg:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-10 items-center">
          {/* LEFT COLUMN — Content */}
          <motion.div
            className="lg:col-span-7 space-y-10 text-left flex flex-col items-start"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Eyebrow / Announcement Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-sm">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                  New
                </span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Atomic Engine 3.0 is live
                </span>
                <ChevronRight size={12} className="text-slate-400" />
              </div>
            </motion.div>

            {/* Hero Headline */}
            <motion.div variants={itemVariants} className="space-y-5">
              <h1 className="text-[3.2rem] sm:text-6xl md:text-7xl lg:text-[5.2rem] font-extrabold tracking-[-0.035em] leading-[0.92] text-slate-900 dark:text-white">
                The operating <br className="hidden sm:block" />
                system for <br className="hidden sm:block" />
                <span className="relative inline-block">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={activeWord}
                      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="text-gradient-primary"
                    >
                      {words[activeWord]}
                    </motion.span>
                  </AnimatePresence>
                  {/* Underline accent */}
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 8"
                    fill="none"
                  >
                    <motion.path
                      d="M2 5.5C20 2.5 60 1 100 3.5C140 6 180 4 198 2"
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.4 }}
                      transition={{ delay: 1, duration: 1, ease: 'easeOut' }}
                    />
                  </svg>
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-normal max-w-xl leading-relaxed">
                Enterprise-grade infrastructure to automate lending, manage
                risk, and scale multi-branch operations all from one platform.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto"
            >
              {IS_LANDING_DOMAIN && !IS_DEV ? (
                <a
                  href={getAppUrl('/register')}
                  className="group relative inline-flex items-center justify-center gap-2.5 bg-primary text-white px-8 py-4 rounded-[14px] font-semibold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_40px_-8px_rgba(var(--primary),0.35)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_20px_50px_-10px_rgba(var(--primary),0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  Get started free
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                </a>
              ) : (
                <Link
                  to="/register"
                  className="group relative inline-flex items-center justify-center gap-2.5 bg-primary text-white px-8 py-4 rounded-[14px] font-semibold text-sm shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_40px_-8px_rgba(var(--primary),0.35)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_20px_50px_-10px_rgba(var(--primary),0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                >
                  Get started free
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                </Link>
              )}
              {IS_LANDING_DOMAIN && !IS_DEV ? (
                <a
                  href={getAppUrl('/documentation')}
                  className="group inline-flex items-center justify-center gap-2.5 bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 px-8 py-4 rounded-[14px] font-semibold text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/15 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 backdrop-blur-xl"
                >
                  <Play size={14} className="text-primary" />
                  View documentation
                </a>
              ) : (
                <Link
                  to="/documentation"
                  className="group inline-flex items-center justify-center gap-2.5 bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 px-8 py-4 rounded-[14px] font-semibold text-sm shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/15 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 backdrop-blur-xl"
                >
                  <Play size={14} className="text-primary" />
                  View documentation
                </Link>
              )}
            </motion.div>

            {/* Metrics Row */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl"
            >
              <MetricCard
                icon={Globe}
                label="Uptime"
                value="99.99%"
                delay={0.7}
                color="blue"
              />
              <MetricCard
                icon={TrendingUp}
                label="Processed"
                value="$2.4B+"
                delay={0.85}
                color="emerald"
              />
              <MetricCard
                icon={Shield}
                label="Security"
                value="Bank-Grade"
                delay={1.0}
                color="violet"
              />
              <MetricCard
                icon={Zap}
                label="Latency"
                value="<50ms"
                delay={1.15}
                color="amber"
              />
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN — Loan Calculator */}
          <div className="lg:col-span-5 relative w-full flex items-center justify-center">
            {/* Decorative ring behind calculator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="w-[120%] h-[120%] rounded-full border border-slate-200/30 dark:border-white/[0.03]"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            <LoanCalculator />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 dark:from-[#020617] to-transparent z-[2]" />
    </section>
  );
};

export default Hero;
