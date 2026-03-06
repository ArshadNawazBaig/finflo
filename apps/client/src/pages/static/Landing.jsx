import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Users,
  Layers,
  Database,
  Globe,
  Bell,
  Shield,
  ShieldCheck,
  Wifi,
  FileSearch,
  MessageSquareMore,
  ArrowLeftRight,
  Code2,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// Navigation is kept non-lazy for immediate interaction
import Navigation from '@/components/landing/Navigation';

// Lazy load sections for performance
const Hero = lazy(() => import('@/components/landing/Hero'));
const Features = lazy(() => import('@/components/landing/Features'));
const Stats = lazy(() => import('@/components/landing/Stats'));
const Testimonials = lazy(() => import('@/components/landing/Testimonials'));
const Workbench = lazy(() => import('@/components/landing/Workbench'));
const MobileShowcase = lazy(
  () => import('@/components/landing/MobileShowcase'),
);
const Pricing = lazy(() => import('@/components/landing/Pricing'));
const FAQ = lazy(() => import('@/components/landing/FAQ'));
const CTA = lazy(() => import('@/components/landing/CTA'));
import Footer from '@/components/landing/Footer';

// Lightweight Loading Fallback
const SectionLoader = () => (
  <div className="h-96 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900/10">
    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

const Landing = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = useMemo(
    () => [
      {
        icon: <Layers className="w-6 h-6 text-blue-500" />,
        title: 'Multi-Branch Financial Engine',
        description:
          'Orchestrate multiple branches with isolated ledger control, custom branding, and hierarchical role-based access from a single consolidated dashboard.',
        color: 'blue',
      },
      {
        icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
        title: 'Automated Credit Risk Management',
        description:
          'Smarter lending with real-time credit ceiling calculations based on member investment history and automated repayment performance tracking.',
        color: 'emerald',
      },
      {
        icon: <Users className="w-6 h-6 text-rose-500" />,
        title: 'Member Lifecycle Management',
        description:
          'Streamlined member onboarding with public self-service registration, live socket-driven approval workflows, and professional dynamic account generation.',
        color: 'rose',
      },
      {
        icon: <Shield className="w-6 h-6 text-indigo-500" />,
        title: 'Regulatory-Grade Audit Ledger',
        description:
          'Build absolute trust with an immutable activity log that tracks every critical system mutation with before/after state snapshots and IP-verified logs.',
        color: 'indigo',
      },
      {
        icon: <Sparkles className="w-6 h-6 text-amber-500" />,
        title: 'Dynamic Business Branding',
        description:
          'High-end professional identity with automated 13-digit dynamic account number generation tailored to your specific business abbreviation.',
        color: 'amber',
      },
      {
        icon: <ArrowLeftRight className="w-6 h-6 text-cyan-500" />,
        title: 'External Fund Reconciliation',
        description:
          'Seamless fund movements to external accounts with integrated ledger reconciliation, category tagging, and automated branch reporting.',
        color: 'cyan',
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-foreground selection:bg-primary/20 overflow-x-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/10 dark:bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      <Navigation
        scrollY={scrollY}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        theme={theme}
        setTheme={setTheme}
      />

      <Suspense fallback={<SectionLoader />}>
        <Hero />
        <Features features={features} />
        <Stats />
        <Workbench />
        <MobileShowcase />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Landing;
