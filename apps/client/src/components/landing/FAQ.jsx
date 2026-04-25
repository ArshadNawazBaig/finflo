import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import useSystemSettings from '@/hooks/useSystemSettings';

const faqData = [
  {
    question: 'What is FinFlo?',
    answer:
      'FinFlo is a secure, cloud-native finance management system designed for global financial institutions. It streamlines the entire finance lifecycle from customer onboarding to final repayment with real-time analytics.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      'Absolutely. We utilize Business Security Code protocols and an immutable ledger system where every transaction is cryptographically hashed, ensuring an indisputable audit trail and bank-grade security.',
  },
  {
    question: 'Can I integrate FinFlo with other apps?',
    answer:
      'Yes, FinFlo is built with an API-first philosophy. We provide a high-performance REST API that allows you to seamlessly integrate with your existing CRM, accounting software, or external payment providers.',
  },
  {
    question: 'Do you support multicurrency and global operations?',
    answer:
      'Our multitenant architecture is engineered for global scale, supporting multiple currencies and localized compliance requirements for international lending operations.',
  },
  {
    question: 'How long does it take to get started?',
    answer:
      'Cloud deployment is near-instant. For enterprise setups requiring custom integrations, our standard onboarding process typically takes less than 48 hours to have your team fully operational.',
  },
];

const FAQItem = ({ question, answer, isOpen, onClick, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className={cn(
          'rounded-xl border transition-all duration-300 overflow-hidden',
          isOpen
            ? 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)]'
            : 'bg-transparent border-slate-100 dark:border-white/[0.04] hover:border-slate-200 dark:hover:border-white/[0.08]',
        )}
      >
        <button
          onClick={onClick}
          className="w-full flex items-center justify-between p-5 md:p-6 text-left gap-4"
        >
          <span
            className={cn(
              'text-base md:text-[17px] font-medium tracking-tight transition-colors',
              isOpen
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-300',
            )}
          >
            {question}
          </span>
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300',
              isOpen
                ? 'bg-primary/10 text-primary rotate-0'
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500',
            )}
          >
            {isOpen ? <Minus size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0">
                <div className="h-px w-full bg-slate-100 dark:bg-white/[0.04] mb-4" />
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                  {answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const FAQ = ({ onContactClick }) => {
  const [openIndex, setOpenIndex] = useState(0);
  const { settings } = useSystemSettings();
  const supportEmail = settings?.supportEmail || 'support@finflo.org';

  return (
    <section
      id="faq"
      className="py-28 lg:py-36 bg-slate-50/50 dark:bg-white/[0.01] px-6 relative overflow-hidden"
    >
      {/* Background accents */}
      <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-violet-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Support Center
          </p>
          <h2 className="text-4xl lg:text-[3.5rem] font-extrabold tracking-[-0.035em] leading-[0.95] text-slate-900 dark:text-white">
            Frequently asked{' '}
            <span className="text-gradient-primary">
              questions
            </span>
          </h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-lg mx-auto">
            Everything you need to know about the platform and how we ensure
            your institution's success.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {faqData.map((faq, index) => (
            <FAQItem
              key={index}
              index={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 p-8 rounded-2xl bg-slate-900 dark:bg-white/[0.03] border border-slate-800 dark:border-white/[0.06] text-center relative overflow-hidden"
        >
          {/* Subtle gradient */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_70%)]" />

          <div className="relative z-10 space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Still have questions?
            </h3>
            <p className="text-slate-400 font-normal text-[15px]">
              Our team is ready to help you get started.
            </p>
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-medium text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 group"
            >
              View all FAQs
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
