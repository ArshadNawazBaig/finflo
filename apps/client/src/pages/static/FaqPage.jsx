import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Plus,
  Minus,
  ArrowLeft,
  HelpCircle,
  Users,
  ShieldCheck,
  UserPlus,
  Briefcase,
  FileText,
  Activity,
  HandCoins,
  Scale,
  Percent,
  CheckCircle,
  MapPin,
  Monitor,
  PiggyBank,
  BarChart3,
  Building2,
  Calculator,
  LayoutDashboard,
  Lock,
  Code,
} from 'lucide-react';
import SEO from '@/components/SEO';
import ContactModal from '@/components/landing/ContactModal';
import { cn } from '@/lib/utils';

const FaqPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    {
      title: 'What is FinFlo?',
      icon: <HelpCircle className="w-5 h-5 text-blue-500" />,
      content:
        'FinFlo is a highly secure, comprehensive lending operating system and branch management platform engineered specifically for modern financial institutions. It streamlines the entire finance lifecycle, providing tools for onboarding members, managing loan approvals, and tracking disbursements and repayments in real-time. Designed to act as the primary infrastructure for lending businesses, it offers deep analytics, compliance tracking, and robust tools to optimize organizational cash flow.',
    },
    {
      title: 'Who can use FinFlo?',
      icon: <Users className="w-5 h-5 text-indigo-500" />,
      content:
        'The platform is built to accommodate the varying needs of lending organizations, from executive management down to frontline staff and end consumers. Super Administrators have full visibility over the ecosystem, Branch Administrators can manage staff and operations for specific regional offices, and Tellers utilize specialized interfaces to process daily cash transactions. Finally, the Members themselves use a dedicated portal to securely apply for, view, and pay off their loans.',
    },
    {
      title: 'What are the different user roles?',
      icon: <Briefcase className="w-5 h-5 text-emerald-500" />,
      content:
        "FinFlo employs a strict Role-Based Access Control (RBAC) system. 'Super Admins' maintain full control over all branches, global financial reporting, and system settings. 'Branch Admins' are restricted to overseeing operations, approving loans, and tracking ledgers within their assigned branch. 'Tellers' handle the day-to-day interactions and cash collection, utilizing a simplified UI designed for rapid transaction processing. Lastly, 'Members' are the verified end-users acquiring loans and managing their digital portfolios.",
    },
    {
      title: 'How do I self-register as a Member?',
      icon: <UserPlus className="w-5 h-5 text-amber-500" />,
      content:
        'Prospective members can initiate the onboarding process through an invitation link distributed by their respective branch, ensuring accurate assignment and localized underwriting. Alternatively, if your institution has enabled the public Self-Register portal, you can sign up directly from the landing page. All self-registrations undergo an automated or manual vetting process by branch administrators before users are authorized to apply for loan products.',
    },
    {
      title: 'How do I apply for a loan?',
      icon: <FileText className="w-5 h-5 text-rose-500" />,
      content:
        'Once you have fully onboarded and logged into your secure Member Portal, you can navigate directly to the "Active SKUs" or "Loans" section to browse available financing products. Clicking "Apply for Loan" will initiate a guided digital workflow where you will specify your desired principal, view the amortized repayment terms, and submit required documentation. Upon final submission, your application is routed directly to your designated branch for underwriter review.',
    },
    {
      title: 'Can I check the status of my loan application?',
      icon: <Activity className="w-5 h-5 text-purple-500" />,
      content:
        "Absolutely. Total transparency is a core feature of the FinFlo Member Portal. As soon as your application is submitted, you can track its real-time progress on your dashboard. Applications are clearly marked with statuses such as 'Pending Review', 'Underwriting', 'Approved', 'Disbursed', or 'Rejected'. You will also receive automated notifications if your branch administrator requires additional documentation prior to final approval.",
    },
    {
      title: 'How are loan penalties calculated?',
      icon: <Scale className="w-5 h-5 text-orange-500" />,
      content:
        'Our automated backend engine calculates late repayment penalties dynamically based strictly on the parameters formalized in your initial loan agreement. When an installment misses its scheduled due date, the system immediately applies a grace period (if applicable) before calculating daily or flat-fee penalties. This automated orchestration eliminates human error and guarantees a transparent, entirely predictable penalty accumulation process.',
    },
    {
      title: 'Are loan agreements digitally binding?',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      content:
        'Yes. When a loan application is approved by the branch, the member must review the final terms and explicitly accept the offer across the FinFlo platform. This digital acceptance leverages secure authentication and cryptographic audit trails, legally signifying your agreement to the principal amount, interest mechanisms, and penalty systems outlined. It acts as an enforceable, legally binding digital contract under applicable e-signature laws.',
    },
    {
      title: 'How is the interest rate calculated?',
      icon: <Percent className="w-5 h-5 text-blue-600" />,
      content:
        'Interest configurations are established at the SKU-level by platform administrators and are computed dynamically based on your specific borrowing profile. FinFlo supports multiple interest calculation models—such as simple flat interest, amortizing schedules, and compounding rates. When you apply, the system provides a comprehensive breakdown in your Truth in Lending statement so you understand exactly how interest accretes over the lifespan of the loan.',
    },
    {
      title: 'Can I pay my loan off early?',
      icon: <HandCoins className="w-5 h-5 text-teal-500" />,
      content:
        'Early loan settlement is supported within FinFlo but heavily depends on the specific guidelines authored by your lending institution for that product. If early payoff is permitted without penalty, the system dynamically recalculates outstanding interest to ensure you are only charged for the exact duration the capital was held. Some loan SKUs may implement early termination fees, which the system will transparently disclose prior to your final payment block.',
    },
    {
      title: 'How does branch-specific tracking work?',
      icon: <MapPin className="w-5 h-5 text-red-500" />,
      content:
        'At the architectural level, FinFlo securely partitions all financial data, transactions, and Member records using a rigid branch-tenant structure. This design empowers administrators to quickly toggle their dashboard views and generate financial analytics specific to localized offices. Transactions, from loan disbursements to incoming cash payments, are permanently stamped with a unique Branch ID, preventing data bleed and enabling highly precise localization performance metrics.',
    },
    {
      title: 'What is Teller Mode?',
      icon: <Monitor className="w-5 h-5 text-sky-500" />,
      content:
        'Teller Mode is a dedicated, streamlined user interface explicitly engineered for tellers and floor staff who manage physical cash transactions. Stripped of complex administrative analytics, it focuses purely on rapid workflows: searching for a member, accepting loan repayments, executing general deposits, and performing formal start-of-day or end-of-day register balancing. This ensures operational speed and minimizes training overhead for frontline staff.',
    },
    {
      title: 'How is cash-in-hand managed?',
      icon: <PiggyBank className="w-5 h-5 text-pink-500" />,
      content:
        'Cash management is rigorously controlled via our independent, branch-scoped ledger systems. During Teller Mode operations, every physical currency movement is logged sequentially. At the close of a business day, tellers execute an "End of Day" sequence that reconciles the physical cash on-site against the digital obligations processed through the portal. This guarantees an uncompromising chain of custody and prevents internal reconciliation discrepancies.',
    },
    {
      title: 'What financial reports are available?',
      icon: <BarChart3 className="w-5 h-5 text-fuchsia-500" />,
      content:
        'FinFlo comes packaged with an enterprise-grade reporting suite capable of satisfying complex audit requirements. System administrators can instantly generate a Trial Balance to verify ledger parity, assess profitability via complete Profit & Loss statements, and analyze liquid assets through a detailed Balance Sheet. Additionally, Branch Analytics provide high-level visual telemetry on localized loan volume, default rates, and branch velocity.',
    },
    {
      title: 'Can I view reports specific to my branch?',
      icon: <Building2 className="w-5 h-5 text-cyan-500" />,
      content:
        "Yes. FinFlo's reporting engine features robust scoping tools that allow Super Admins and Branch Admins to generate highly targeted analytics. By selecting a specific branch from the dropdown selector within the Ledger and Reporting modules, the entire dashboard instantly re-filters. This localized reporting restricts all metrics, from total disbursed capital down to individual teller performance, strictly to that specific branch ID.",
    },
    {
      title: 'How are currency amounts displayed?',
      icon: <Calculator className="w-5 h-5 text-lime-600" />,
      content:
        "To uphold strict financial compliance and precision, FinFlo enforces the display of exact, non-compacted currency figures across all official reports. Unlike generalized dashboards that might abbreviate a value as '1.5M', our Trial Balance, Balance Sheet, and P&L readouts will display the absolute value (e.g., $1,500,000.00). This unwavering commitment to precision is mandatory for auditors and ensures institutional accuracy.",
    },
    {
      title: 'What are Active SKUs?',
      icon: <LayoutDashboard className="w-5 h-5 text-indigo-400" />,
      content:
        'Active SKUs serve as the customizable product catalog for your lending institution. They represent the various standardized financing packages, categorized by parameters like minimum/maximum loan limits, duration options, default interest rates, and categorical eligibility. By formalizing lending options into active SKUs, administrators maintain tight control over product availability and can rapidly sunset older loan packages without disrupting existing active agreements.',
    },
    {
      title: 'How do I manage the pricing dashboard?',
      icon: <Activity className="w-5 h-5 text-yellow-500" />,
      content:
        'The administration platform includes a comprehensive Pricing and Active SKUs dashboard. Here, authorized Super Admins and managers can utilize intuitive search and filtering tools to rapidly adjust lending parameters. You can edit SKU details in real-time, instantly adjusting terms, descriptions, or rates. Any modifications apply directly to the Member Portal, meaning new applicants will automatically be presented with your most heavily updated parameters.',
    },
    {
      title: 'Is my financial data secure?',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      content:
        'Security is the absolute core of the FinFlo architecture. The platform deploys enterprise-grade encryption at rest and in transit, utilizing AES-256 protocols alongside continuous database replication to prevent data loss. Every sensitive action—from logging in to executing a transaction—is monitored by our immutable audit logging system. Furthermore, robust Role-Based Access Control prevents specialized staff from accessing sensitive metrics outside their immediate purview.',
    },
    {
      title: 'How do I use Google Sign-In with FinFlo?',
      icon: <Lock className="w-5 h-5 text-blue-500" />,
      content:
        "To accelerate user onboarding and eliminate password fatigue, FinFlo intrinsically supports OAuth2.0 integrations, specifically allowing secure access via Google Sign-In. Both platform Administrators and Members can opt to link their registered email with their Google account. This process bypasses traditional credential forms, securely requesting authentication directly through Google's encrypted SSO pipeline to log instantly into your respective portal.",
    },
    {
      title: 'Does FinFlo support API integrations?',
      icon: <Code className="w-5 h-5 text-slate-500" />,
      content:
        'Yes. FinFlo is designed with an API-first approach, meaning nearly every action you can take in the dashboard can be programmatically invoked via our secure REST APIs. We provide extensive API Documentation accessible directly from the landing page. This allows institutional engineers to wire custom webhooks, build mobile extensions, or feed loan compliance data seamlessly into external CRM platforms, accounting ledgers, or global BI tools.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-foreground font-sans overflow-x-hidden selection:bg-primary/20">
      <SEO
        title="Frequently Asked Questions"
        description="Find answers to common questions about the FinFlo lending operating system and branch management platform."
        canonical="/faq"
      />
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-500/5 dark:bg-blue-500/5 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />
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
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors group"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Contact Support</span>
          </button>
        </div>
      </nav>

      {/* Header */}
      <header className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Support Center
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white"
          >
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              Questions.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Find answers to common questions about the FinFlo lending operating
            system, our features, security, and the branch management platform.
          </motion.p>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-32 z-10 relative">
        <div className="max-w-3xl mx-auto space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (index % 10) * 0.05 }}
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
      <footer className="py-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#020617] relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm font-medium">
            &copy; {new Date().getFullYear()} FinFlo Infrastructure. All rights
            reserved.
          </p>
        </div>
      </footer>

      {/* Contact Enterprise Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default FaqPage;
