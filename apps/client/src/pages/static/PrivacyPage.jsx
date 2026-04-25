import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  Plus,
  Minus,
  Lock,
  Eye,
  FileText,
  ArrowLeft,
  Globe,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';

const PrivacyPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    {
      title: 'Information Collection',
      icon: <Eye className="w-5 h-5 text-blue-500" />,
      content:
        'We collect information you provide directly to us when you create an account, apply for a loan, or communicate with us. This may include your name, email address, phone number, financial information, and government-issued identification. We also automatically collect certain information about your device and usage of our services through cookies and similar technologies.',
    },
    {
      title: 'Data Usage & Processing',
      icon: <FileText className="w-5 h-5 text-indigo-500" />,
      content:
        'We use the information we collect to provide, maintain, and improve our services, process loan applications, assess creditworthiness, prevent fraud, and communicate with you. Your data is processed using secure, automated systems to ensure unbiased decision-making and efficient service delivery.',
    },
    {
      title: 'Security Measures',
      icon: <Lock className="w-5 h-5 text-emerald-500" />,
      content:
        'We implement bank-grade security measures designed to protect your information from unauthorized access, disclosure, alteration, and destruction. This includes AES-256 encryption for data at rest and in transit, multi-factor authentication, and regular security audits of our infrastructure.',
    },
    {
      title: 'Third-Party Sharing',
      icon: <Globe className="w-5 h-5 text-violet-500" />,
      content:
        'We do not sell your personal information. We may share your information with third-party service providers who perform services on our behalf, such as credit bureaus, payment processors, and cloud hosting providers. These partners are bound by strict confidentiality agreements and data protection obligations.',
    },
    {
      title: 'Your Rights',
      icon: <Shield className="w-5 h-5 text-rose-500" />,
      content:
        'Depending on your jurisdiction, you may have the right to access, correct, delete, or restrict the processing of your personal information. You can manage your communication preferences and account settings directly through the FinFlo dashboard or by contacting our support team.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-foreground font-sans overflow-x-hidden selection:bg-primary/20">
      <SEO
        title="Privacy Policy"
        description="Learn how FinFlo secures and protects your financial data. Our privacy policy outlines our commitment to transparency and bank-grade security."
        canonical="/privacy"
      />
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/5 dark:bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrollY > 30
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-100 dark:border-white/[0.04] py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors">
              <ArrowLeft size={15} className="text-slate-500 dark:text-slate-400" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              Home
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="hidden sm:block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Updated Feb 2026
            </span>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest"
          >
            <Shield className="w-3.5 h-3.5" />
            Legal Documentation
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white"
          >
            Privacy{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Policy.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Transparency is the foundation of trust. We believe you have a right
            to know exactly how your data is secured, processed, and protected
            within the FinFlo infrastructure.
          </motion.p>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-32">
        <div className="max-w-3xl mx-auto space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <div
                onClick={() =>
                  setActiveSection(activeSection === index ? -1 : index)
                }
                className={cn(
                  'group cursor-pointer rounded-xl border transition-all duration-300 overflow-hidden',
                  activeSection === index
                    ? 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)]'
                    : 'bg-transparent border-slate-100 dark:border-white/[0.04] hover:border-slate-200 dark:hover:border-white/[0.08]',
                )}
              >
                <div className="w-full flex items-center justify-between p-5 md:p-6 text-left gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300',
                        activeSection === index
                          ? 'bg-primary/10 text-primary'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-primary group-hover:bg-primary/5',
                      )}
                    >
                      {section.icon}
                    </div>
                    <span
                      className={cn(
                        'text-base md:text-[17px] font-medium tracking-tight transition-colors',
                        activeSection === index
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300',
                      )}
                    >
                      {section.title}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300',
                      activeSection === index
                        ? 'bg-primary/10 text-primary rotate-0'
                        : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500',
                    )}
                  >
                    {activeSection === index ? (
                      <Minus size={14} strokeWidth={2.5} />
                    ) : (
                      <Plus size={14} strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {activeSection === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 sm:pl-[4.5rem]">
                        <div className="h-px w-full bg-slate-100 dark:bg-white/[0.04] mb-4" />
                        <p className="text-[15px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} FinFlo Infrastructure. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
