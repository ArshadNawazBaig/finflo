import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import {
  Users,
  Layers,
  Shield,
  ShieldCheck,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

import Navigation from '@/components/landing/Navigation';
import SEO from '@/components/SEO';
import ContactModal from '@/components/landing/ContactModal';

import Hero from '@/components/landing/Hero';
const TrustedBy = lazy(() => import('@/components/landing/TrustedBy'));
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
  <div className="h-64 w-full flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
  </div>
);

const Landing = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = useMemo(
    () => [
      {
        icon: <Layers className="w-6 h-6 text-blue-500" />,
        title: 'Multi-Branch Atomic Engine',
        description:
          'High-precision financial logic with Atomic Idempotent Operations. Orchestrate multiple branches with custom domains and isolated ledger control.',
        color: 'blue',
      },
      {
        icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
        title: 'Automated Credit & Risk Scoring',
        description:
          'Smarter lending with real-time credit ceiling calculations and daily behavior-based risk updates. 100% data integrity for all profit distributions.',
        color: 'emerald',
      },
      {
        icon: <Users className="w-6 h-6 text-rose-500" />,
        title: 'Interactive Member Ecosystem',
        description:
          'Guided onboarding for members and staff, live socket-driven approval workflows, and professional dynamic account generation across the platform.',
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
        title: 'Professional White-Label Branding',
        description:
          'Enterprise-grade identity with custom domain support and automated 13-digit account numbers tailored to your specific business abbreviation.',
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

  // Structured Data (JSON-LD) for Google
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Finflo Banking OS',
    operatingSystem: 'Web',
    applicationCategory: 'FinanceApplication',
    description:
      "The world's most sophisticated lending operating system for hyper-growth institutions.",
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] text-foreground selection:bg-primary/20 overflow-x-hidden font-sans">
      <SEO
        title="FinFlo — The Operating System for Lending"
        description="Enterprise-grade infrastructure to automate lending, manage risk, and scale multi-branch operations. Trusted by leading financial institutions worldwide."
        keywords="finflo, banking operating system, lending automation, credit risk scoring, multi-branch banking, financial infrastructure, white-label banking, fintech, financial software, loan management, digital banking"
        canonical="/"
      />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      <Navigation
        scrollY={scrollY}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        theme={theme}
        setTheme={setTheme}
      />

      <Hero />

      <Suspense fallback={<SectionLoader />}>
        <TrustedBy />
        <Features features={features} />
        <Stats />
        <Workbench />
        <MobileShowcase />
        <Testimonials />
        <Pricing onContactClick={() => setIsContactModalOpen(true)} />
        <FAQ onContactClick={() => setIsContactModalOpen(true)} />
        <CTA onContactClick={() => setIsContactModalOpen(true)} />
        <Footer />
      </Suspense>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default Landing;
