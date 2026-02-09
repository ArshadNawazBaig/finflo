import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Shield,
  Zap,
  PieChart,
  Users,
  Wallet,
  CheckCircle2,
  Menu,
  X,
  Lock,
  Globe,
  BarChart3,
  Sun,
  Moon,
  TrendingUp,
  Activity,
  Award,
  ChevronRight,
  Layers,
  Database,
  Smartphone,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const Landing = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-emerald-500" />,
      title: 'Bank-Grade Security',
      description:
        'AES-256 encryption and SOC2 compliant infrastructure protecting every bit of data.',
      color: 'emerald',
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      title: 'Instant Underwriting',
      description:
        'Automated risk assessment nodes that process complex loan applications in milliseconds.',
      color: 'amber',
    },
    {
      icon: <Layers className="w-6 h-6 text-blue-500" />,
      title: 'Multitenant Architecture',
      description:
        'Scale infinitely with our modular cloud-native engine built for global institutions.',
      color: 'blue',
    },
    {
      icon: <Database className="w-6 h-6 text-indigo-500" />,
      title: 'Immutable Ledger',
      description:
        'Every transaction is cryptographically hashed for an indisputable audit trail.',
      color: 'indigo',
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-rose-500" />,
      title: 'Neural Analytics',
      description:
        'Predictive modeling that identifies portfolio risks before they impact your yield.',
      color: 'rose',
    },
    {
      icon: <Globe className="w-6 h-6 text-violet-500" />,
      title: 'API First Ecosystem',
      description:
        'Seamlessly integrate with external providers through our high-performance REST API.',
      color: 'violet',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-foreground selection:bg-primary/20 overflow-x-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/10 dark:bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Glass Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrollY > 30
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-4 shadow-xl'
            : 'py-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-11 h-11 bg-primary shadow-2xl shadow-primary/40 rounded-2xl flex items-center justify-center text-primary-foreground font-black text-xl group-hover:rotate-6 transition-all duration-500">
              LM
            </div>
            <div className="flex flex-col -gap-1">
              <span className="text-xl font-black tracking-tighter leading-none">
                LOANMASTER
              </span>
              <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">
                Infrastructure
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-10">
            {['Architecture', 'The Workbench', 'Scale'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all relative group"
              >
                {item}
                <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-200/50 dark:bg-white/5 hover:bg-primary/10 transition-colors text-slate-600 dark:text-slate-400"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-black uppercase tracking-widest px-6 py-2.5 hover:text-primary transition-colors"
              >
                Access Portal
              </Link>
              <Link
                to="/register"
                className="bg-primary text-primary-foreground px-8 py-3.5 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 group"
              >
                Get Started
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden w-11 h-11 bg-slate-200/50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-foreground transition-all active:scale-95"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[150] bg-white dark:bg-slate-950 lg:hidden flex flex-col p-8"
          >
            <div className="flex justify-end mb-12">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-8">
              {['Architecture', 'The Workbench', 'Scale'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-5xl font-black tracking-tighter"
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="mt-auto space-y-4">
              <Link
                to="/register"
                className="block w-full py-5 bg-primary text-primary-foreground text-center rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/20"
              >
                Start Deploying
              </Link>
              <Link
                to="/login"
                className="block w-full py-5 border border-slate-200 dark:border-white/10 text-center rounded-2xl font-black uppercase tracking-widest text-sm"
              >
                Login to Portal
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero: The Evolution */}
      <section className="relative pt-32 pb-20 px-6 lg:pt-40 lg:pb-28">
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
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-indigo-600 to-violet-700 italic">
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
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)] hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95 text-xs"
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
                    className="w-full relative z-20 drop-shadow-[0_0_100px_rgba(99,102,241,0.3)]"
                  />
                  {/* Floating Micro-UI element */}
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

      {/* Architecture Grid */}
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
              Engineered with a cloud-native vision, LoanMaster offers the most
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
                <button className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary opacity-50 group-hover:opacity-100 transition-all">
                  Read Technical Docs <ArrowRight size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Workbench: Authentic Experience */}
      <section
        id="the-workbench"
        className="py-24 bg-slate-950 text-white overflow-hidden relative"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
              Digital Command Center
            </h2>
            <h3 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none">
              A UI designed for <br />{' '}
              <span className="italic text-primary">Mastery.</span>
            </h3>
            <p className="text-lg text-slate-400 font-medium">
              Don't take our word for it. Explore the actual environment your
              administrators will orchestrate.
            </p>
          </div>

          <div className="space-y-32">
            {/* Workbench Item 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl">
                  <TrendingUp size={24} className="text-primary-foreground" />
                </div>
                <h4 className="text-3xl font-black tracking-tighter">
                  Command Center <br />{' '}
                  <span className="text-slate-500">Analytics V4</span>
                </h4>
                <ul className="space-y-4">
                  {[
                    'Real-time ROI computation across all loan tiers.',
                    'Predictive default risk scoring using neural nodes.',
                    'Dynamic treasury balancing for capital efficiency.',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-4 text-slate-400 font-medium leading-relaxed text-sm"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary mt-0.5">
                        <CheckCircle2 size={10} strokeWidth={4} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="absolute -inset-4 bg-primary/30 blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative rounded-[2.5rem] max-w-[500px]">
                  <img
                    src="/screenshots/d1.png"
                    alt="Command Center"
                    className="w-full transition-transform duration-1000 group-hover:scale-105"
                  />
                </div>
              </motion.div>
            </div>

            {/* Workbench Item 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true }}
                className="relative group order-2 lg:order-1"
              >
                <div className="absolute -inset-4 bg-emerald-500/30 blur-[100px] opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="relative rounded-[2.5rem] max-w-[500px]">
                  <img
                    src="/screenshots/d3.png"
                    alt="Ledger Management"
                    className="w-full transition-transform duration-1000 group-hover:scale-105"
                  />
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6 order-1 lg:order-2"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Database size={24} />
                </div>
                <h4 className="text-3xl font-black tracking-tighter">
                  Unified Ledger <br />{' '}
                  <span className="text-slate-500">Indisputable History</span>
                </h4>
                <ul className="space-y-4">
                  {[
                    'Zero-latency transaction history tracking.',
                    'Automated repayment scheduling and collection nodes.',
                    'Smart contract logic for automated late fees.',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-4 text-slate-400 font-medium leading-relaxed text-sm"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mt-0.5">
                        <CheckCircle2 size={10} strokeWidth={4} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Features Showcase */}
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
                  src="/screenshots/m1.png"
                  alt="Mobile Analytics"
                  className="w-full max-w-[320px] mx-auto rotate-[-5deg] hover:rotate-0 transition-transform duration-700"
                />
              </motion.div>
            </div>
            <div className="space-y-8">
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
                Seamless Mobility
              </h2>
              <h3 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none dark:text-white">
                Power in your <br />{' '}
                <span className="italic text-primary">Pocket.</span>
              </h3>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Management never stops. Our mobile-first interface ensures your
                agents can approve loans, track repayments, and manage customers
                from the field with full infrastructure power.
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

      {/* Pricing: The Investment */}
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
            {[
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
            ].map((plan, i) => (
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

      {/* Final CTA: The Transition */}
      <section className="py-24 px-6 relative z-10 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative bg-slate-950 rounded-[4rem] p-12 lg:p-24 text-center text-white overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2),transparent)]" />
            <div className="relative z-10 space-y-8">
              <h2 className="text-5xl lg:text-[6rem] font-black tracking-tighter leading-none">
                Begin your <br />{' '}
                <span className="text-primary italic">
                  Financial Evolution.
                </span>
              </h2>
              <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                Stop managing with spreadsheets. Deploy LoanMaster today and
                transform your lending operations into an automated powerhouse.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <Link
                  to="/register"
                  className="bg-primary text-primary-foreground px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] hover:scale-105 transition-all active:scale-95"
                >
                  Initiate System Now
                </Link>
                <button className="bg-white/5 backdrop-blur-xl border border-white/10 px-10 py-5 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all active:scale-95">
                  Talk to Infrastructure
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer: Nexus Infrastructure */}
      <footer className="py-24 bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-white/5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-xl shadow-xl">
                LM
              </div>
              <span className="text-2xl font-black tracking-tighter dark:text-white">
                LOANMATER<span className="text-primary italic">CORE</span>
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
              The foundational operating layer for modern financial
              institutions. Precision-engineered for global capital flow.
            </p>
            <div className="flex gap-4">
              {[Globe, Users, Activity, Award].map((Icon, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all cursor-pointer group"
                >
                  <Icon
                    size={20}
                    strokeWidth={2.5}
                    className="group-hover:scale-110 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>

          {[
            {
              title: 'Ecosystem',
              items: [
                'Ledger Core',
                'Neural Underwriting',
                'Neural Risks',
                'API Gateway',
              ],
            },
            {
              title: 'Company',
              items: [
                'Nexus Infrastructure',
                'Global Policy',
                'Terms of Service',
                'Security Layer',
                'Partnerships',
              ],
            },
            {
              title: 'Support',
              items: [
                'Technical Logs',
                'Integration Wiki',
                'Network Status',
                'Careers',
              ],
            },
          ].map((col, i) => (
            <div key={i}>
              <h5 className="text-[10px] font-black uppercase tracking-[0.4em] mb-10 text-slate-900 dark:text-slate-200">
                {col.title}
              </h5>
              <ul className="space-y-6">
                {col.items.map((item, j) => {
                  const linkMap = {
                    'Global Policy': '/privacy',
                    'Terms of Service': '/terms',
                  };
                  const path = linkMap[item];

                  return path ? (
                    <li key={j} className="w-fit">
                      <Link
                        to={path}
                        className="text-sm font-black text-slate-500 hover:text-primary transition-colors cursor-pointer relative group block"
                      >
                        {item}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={j}
                      className="text-sm font-black text-slate-500 hover:text-primary transition-colors cursor-pointer relative group w-fit"
                    >
                      {item}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto mt-32 pt-12 border-t border-slate-200 dark:border-white/5 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em] opacity-60">
            © 2026 LOANMASTER INFRASTRUCTURE. OPERATING AT GLOBAL SCALE. ALL
            DATA CRYPTOGRAPHICALLY SECURED.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
