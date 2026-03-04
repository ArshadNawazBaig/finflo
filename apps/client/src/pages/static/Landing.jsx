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
        icon: <Users className="w-6 h-6 text-rose-500" />,
        title: 'Member Self-Registration',
        description:
          'Members apply publicly with a business security code. Admins approve or reject instantly — applicants receive live socket-driven status updates the moment a decision is made.',
        color: 'rose',
      },
      {
        icon: <Wifi className="w-6 h-6 text-amber-500" />,
        title: 'Real-Time Socket Infrastructure',
        description:
          'WebSocket-powered live events for approval results, notification badges, chat presence, typing indicators, and admin member registration counts — all zero-poll.',
        color: 'amber',
      },
      {
        icon: <MessageSquareMore className="w-6 h-6 text-violet-500" />,
        title: 'Encrypted Live Chat',
        description:
          'Full-featured real-time messaging between staff and members with typing indicators, voice notes, and media support. Includes per-user history clearing for maximum privacy.',
        color: 'violet',
      },
      {
        icon: <Sparkles className="w-6 h-6 text-blue-500" />,
        title: 'Dynamic Business Branding',
        description:
          'Set your business abbreviation and watch the system generate professional, 13-digit dynamic account numbers for every customer and member automatically.',
        color: 'blue',
      },
      {
        icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
        title: 'Automated Credit Limits',
        description:
          'Real-time credit ceiling calculations based on member investment balance and repayment history for safer, smarter lending decisions.',
        color: 'emerald',
      },
      {
        icon: <FileSearch className="w-6 h-6 text-indigo-500" />,
        title: 'KYC Vault & OCR Scanning',
        description:
          'Encrypted document storage for customer identification and contracts. Tesseract OCR auto-extracts CNIC and document data directly from uploaded images.',
        color: 'indigo',
      },
      {
        icon: <Shield className="w-6 h-6 text-emerald-600" />,
        title: 'Immutable Audit Ledger',
        description:
          'Regulatory-grade activity tracking with before/after state snapshots and IP logging for every critical system mutation across all branches.',
        color: 'emerald',
      },
      {
        icon: <Layers className="w-6 h-6 text-blue-500" />,
        title: 'Multi-Branch Engine',
        description:
          'Scalable infrastructure supporting hierarchical branches with independent branding, role-based permissions, and isolated access control.',
        color: 'blue',
      },
      {
        icon: <ArrowLeftRight className="w-6 h-6 text-cyan-500" />,
        title: 'External Fund Transfers',
        description:
          'Initiate tracked fund movements to external accounts with full ledger reconciliation, category tagging, and branch-level financial reporting.',
        color: 'cyan',
      },
      {
        icon: <Code2 className="w-6 h-6 text-fuchsia-500" />,
        title: 'Developer-First REST API',
        description:
          'Modern REST API with comprehensive response schemas, role-gated endpoints, Socket.io event reference, and API key documentation for third-party integrations.',
        color: 'fuchsia',
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
