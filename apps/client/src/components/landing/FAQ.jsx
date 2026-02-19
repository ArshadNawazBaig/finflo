import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqData = [
  {
    question: 'What is FinFlow?',
    answer:
      'FinFlow is a secure, cloud-native finance management system designed for global financial institutions. It streamlines the entire finance lifecycle from customer onboarding to final repayment with real-time analytics.',
  },
  {
    question: 'Is my financial data secure?',
    answer:
      'Absolutely. We utilize Business Security Code protocols and an immutable ledger system where every transaction is cryptographically hashed, ensuring an indisputable audit trail and bank-grade security.',
  },
  {
    question: 'Can I integrate FinFlow with other apps?',
    answer:
      'Yes, FinFlow is built with an API-first philosophy. We provide a high-performance REST API that allows you to seamlessly integrate with your existing CRM, accounting software, or external payment providers.',
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'group mb-4 rounded-3xl border transition-all duration-500 overflow-hidden',
        isOpen
          ? 'bg-white dark:bg-slate-900 border-primary shadow-[0_20px_50px_rgba(99,102,241,0.1)]'
          : 'bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-white/5 hover:border-primary/30',
      )}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500',
              isOpen ? 'bg-primary text-white' : 'bg-primary/10 text-primary',
            )}
          >
            <HelpCircle size={20} />
          </div>
          <span className="text-lg md:text-xl font-black tracking-tight dark:text-white">
            {question}
          </span>
        </div>
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-transform duration-500',
            isOpen && 'rotate-180 bg-primary/20 text-primary',
          )}
        >
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="px-6 md:px-8 pb-8 pt-0">
              <div className="h-px w-full bg-slate-100 dark:bg-white/5 mb-6" />
              <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-3xl">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section
      id="faq"
      className="py-24 bg-white dark:bg-slate-900/10 px-6 relative overflow-hidden"
    >
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 translate-x-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
            Support Center
          </h2>
          <h3 className="text-4xl lg:text-[4rem] leading-[0.9] font-black tracking-tighter dark:text-white">
            Commonly{' '}
            <span className="text-primary italic">Asked Questions.</span>
          </h3>
          <p className="text-base text-slate-500 font-medium max-w-lg mx-auto">
            Everything you need to know about the platform and how we ensure
            your institution's success.
          </p>
        </div>

        <div className="space-y-4">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 p-8 rounded-[3rem] bg-gradient-to-br from-primary to-indigo-600 text-white text-center shadow-2xl shadow-primary/20"
        >
          <h4 className="text-2xl font-black mb-2">Still have questions?</h4>
          <p className="text-white/80 font-medium mb-6">
            Our dedicated support team is ready to help you scale.
          </p>
          <button className="px-8 py-4 bg-white text-primary rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform">
            Contact Enterprise Support
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
