import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users, Layers, Database, Globe, Bell, Shield } from 'lucide-react';
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
        icon: <Users className="w-6 h-6 text-rose-500" />,
        title: 'Member Self-Service',
        description:
          'Advanced portal for borrowers and investors to manage portfolios, track ROI, and execute P2P transfers.',
        color: 'rose',
      },
      {
        icon: <Bell className="w-6 h-6 text-amber-500" />,
        title: 'Infinite Notifications',
        description:
          'Real-time, paginated notification engine with adaptive infinite scroll for seamless mobile alerting.',
        color: 'amber',
      },
      {
        icon: <Shield className="w-6 h-6 text-emerald-500" />,
        title: 'Immutable Audit Ledger',
        description:
          'Regulatory-grade activity tracking with before/after state snapshots for every critical system mutation.',
        color: 'emerald',
      },
      {
        icon: <Database className="w-6 h-6 text-indigo-500" />,
        title: 'KYC Document Vault',
        description:
          'Secure, encrypted storage for customer identification, collateral documents, and digital contracts.',
        color: 'indigo',
      },
      {
        icon: <Layers className="w-6 h-6 text-blue-500" />,
        title: 'Multi-Branch Engine',
        description:
          'Scalable infrastructure supporting hierarchical branches with independent branding and access control.',
        color: 'blue',
      },
      {
        icon: <Globe className="w-6 h-6 text-violet-500" />,
        title: 'Developer First API',
        description:
          'Modern REST API with comprehensive response schemas and automated documentation for third-party scaling.',
        color: 'violet',
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
