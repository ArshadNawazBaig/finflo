import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  FileText,
  ArrowLeft,
  Globe,
} from 'lucide-react';

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
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/5 dark:bg-blue-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrollY > 30
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-4 shadow-xl'
            : 'py-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-0 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary shadow-lg shadow-primary/30 rounded-xl flex items-center justify-center text-primary-foreground font-black group-hover:rotate-6 transition-all duration-500">
              <ArrowLeft size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">
              Return Home
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/10">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-200">
              Last Updated: Feb 08, 2026
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
                className={`group cursor-pointer rounded-3xl border transition-all duration-500 overflow-hidden ${
                  activeSection === index
                    ? 'bg-white dark:bg-white/5 border-primary/50 shadow-2xl shadow-primary/10'
                    : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-primary/30 hover:bg-white dark:hover:bg-white/10'
                }`}
              >
                <div className="p-6 sm:p-8 flex items-center justify-between">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
                        activeSection === index
                          ? 'bg-primary/10 text-primary'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-primary group-hover:bg-primary/5'
                      }`}
                    >
                      {section.icon}
                    </div>
                    <h3
                      className={`text-xl font-bold tracking-tight transition-colors ${
                        activeSection === index
                          ? 'text-primary'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {section.title}
                    </h3>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      activeSection === index
                        ? 'bg-primary text-primary-foreground rotate-180'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                    }`}
                  >
                    <ChevronDown size={20} />
                  </div>
                </div>
                <AnimatePresence>
                  {activeSection === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-8 pb-8 sm:pl-[5.5rem]">
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base sm:text-lg font-medium">
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
