import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book,
  Code2,
  Rocket,
  LayoutGrid,
  Menu,
  ChevronRight,
  Search,
  ExternalLink,
  LifeBuoy,
  ArrowLeft,
  Shield,
  CreditCard,
  Bell,
  Globe,
  Lock,
  Eye,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const Documentation = () => {
  const [activeSection, setActiveSection] = useState('introduction');
  const [scrollY, setScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Scroll to top on section change
    if (window.scrollY > 400) {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  }, [activeSection]);

  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: <Book className="w-4 h-4" />,
      content: (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-black tracking-tight mb-4">
              Welcome to Loan Master
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Loan Master is a comprehensive loan management SaaS platform
              designed to streamline your lending operations. From customer
              onboarding to loan tracking and automated reporting, providing
              everything you need to run a successful lending business. Released
              under the <strong className="text-foreground">MIT License</strong>{' '}
              with professional-grade{' '}
              <strong className="text-foreground">Issue Templates</strong> for
              seamless collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-8 rounded-[2rem] bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm hover:border-primary/30 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2 group-hover:text-primary transition-colors">
                <Rocket className="w-5 h-5 text-primary" />
                Quick Start
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Get your system up and running in less than 5 minutes. Configure
                your settings and invite your team.
              </p>
              <Button
                variant="outline"
                className="w-full py-6 rounded-full border-border/50 hover:bg-primary/5 font-black uppercase tracking-widest text-[10px]"
                onClick={() => setActiveSection('getting-started')}
              >
                Go to Guide
              </Button>
            </div>
            <div className="p-8 rounded-[2rem] bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm hover:border-indigo-500/30 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
                <Code2 className="w-5 h-5 text-indigo-500" />
                API Reference
              </h3>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Integrate Loan Master with your existing tools using our robust
                REST API.
              </p>
              <Button
                variant="outline"
                className="w-full py-6 rounded-full border-border/50 hover:bg-indigo-500/5 font-black uppercase tracking-widest text-[10px]"
                onClick={() => setActiveSection('api-reference')}
              >
                View API Docs
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Rocket className="w-4 h-4" />,
      content: (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-4">
              Getting Started
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Follow these steps to set up your Loan Master account and start
              lending.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 p-6 rounded-[2rem] bg-card/30 border border-border/50 hover:bg-card/50 transition-colors duration-300">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner">
                1
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Create an Account</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sign up for a Loan Master account or clone the repository for
                  local development. You'll start on the Free plan, which is
                  perfect for testing the platform. No credit card required.
                </p>
              </div>
            </div>
            <div className="flex gap-6 p-6 rounded-[2rem] bg-card/30 border border-border/50 hover:bg-card/50 transition-colors duration-300">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner">
                2
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Configure Settings</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Go to <strong>Settings</strong> to customize your workspace.
                  Set your default currency, interest rates, and branding
                  options to match your business.
                </p>
              </div>
            </div>
            <div className="flex gap-6 p-6 rounded-[2rem] bg-card/30 border border-border/50 hover:bg-card/50 transition-colors duration-300">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner">
                3
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Add Customers</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Navigate to the <strong>Customers</strong> tab and click "Add
                  Customer". Input their details to create a profile. You can
                  also import customers in bulk via CSV.
                </p>
              </div>
            </div>
            <div className="flex gap-6 p-6 rounded-[2rem] bg-card/30 border border-border/50 hover:bg-card/50 transition-colors duration-300">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner">
                4
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Issue a Loan</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  From a customer's profile, click "Issue New Loan". Select the
                  loan product, amount, and term. The system will automatically
                  calculate the repayment schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'features',
      title: 'Key Features',
      icon: <LayoutGrid className="w-4 h-4" />,
      content: (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-4">
              Key Features
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Explore the powerful tools built into Loan Master.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <LayoutGrid className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Loan Management</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Track active, pending, and completed loans. View detailed
                payment schedules, calculate interest automatically, and manage
                loan statuses with ease.
              </p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <LifeBuoy className="w-6 h-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Customer CRM</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A complete CRM for your borrowers. Store contact info,
                documents, and credit history. View a 360-degree profile of
                every customer.
              </p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Rocket className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Automated Reports</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate financial reports instantly. Track repayment rates,
                total outstanding amounts, and revenue growth with visual
                charts.
              </p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Modern Responsive UX</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Experience a state-of-the-art interface with a full-screen
                (100vh) immersive Hero section, fluid animations, and perfect
                vertical alignment optimized for both mobile and desktop.
              </p>
            </div>
            <div className="p-8 rounded-[2.5rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Bell className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">Dynamic FAQ & Support</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Leverage a sophisticated, interactive FAQ system with accordion
                animations Powered by Framer Motion, ensuring your customers get
                the answers they need instantly.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      icon: <Code2 className="w-4 h-4" />,
      content: (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-4">
              API Reference
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Developers can use our API to build custom integrations.
            </p>
          </div>

          <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/20">
            <p className="text-sm font-medium flex items-center gap-3">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                Note
              </span>
              API access is available on the <strong>Pro</strong> plan.
            </p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Authentication</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Authenticate your requests using a Bearer token. You can
                generate an API key from the Developer Settings page.
              </p>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <pre className="relative bg-slate-950 text-slate-50 p-6 rounded-2xl text-xs overflow-x-auto font-mono">
                  <code>Authorization: Bearer YOUR_API_KEY</code>
                </pre>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold">Endpoints</h3>
              <div className="space-y-4">
                <div className="p-6 rounded-[2rem] bg-card/50 border border-border/50 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-emerald-500/20 tracking-wider">
                      GET
                    </span>
                    <code className="text-sm font-bold font-mono">
                      /v1/customers
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    List all customers. Supports pagination and filtering.
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] bg-card/50 border border-border/50 backdrop-blur-sm group hover:border-blue-500/30 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-blue-500/20 tracking-wider">
                      POST
                    </span>
                    <code className="text-sm font-bold font-mono">
                      /v1/loans
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create a new loan application.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-border/50">
              <Link to="/documentation/api">
                <Button
                  variant="default"
                  className="w-full sm:w-auto h-12 px-8 rounded-full gap-2 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Full API Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const SidebarContent = () => (
    <nav className="space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
            activeSection === section.id
              ? 'bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <div className="flex items-center gap-3">
            {section.icon}
            {section.title}
          </div>
          {activeSection === section.id && (
            <ChevronRight className="w-4 h-4 opacity-50" />
          )}
        </button>
      ))}

      <div className="pt-4 mt-4 border-t border-border/50">
        <Link to="/support">
          <button className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-4 h-4" />
              Support Center
            </div>
          </button>
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrollY > 30
            ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-4 shadow-xl'
            : 'py-8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary shadow-lg shadow-primary/30 rounded-xl flex items-center justify-center text-primary-foreground font-black group-hover:rotate-6 transition-all duration-500">
              <ArrowLeft size={20} />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">
              Return Home
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/10">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              System Documentation
            </span>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-4 pt-12">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="relative pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest"
          >
            <Book className="w-3.5 h-3.5" />
            Knowledge Base
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white"
          >
            System{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Documentation.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Comprehensive guides and resources to help you build, manage, and
            scale your lending operations with LoanMaster.
          </motion.p>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-8">
              <div>
                <h1 className="text-xl font-black tracking-tight mb-6 px-4">
                  Docs
                </h1>
                <div className="relative mb-6 px-0 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search docs..."
                    className="w-full pl-9 pr-4 h-10 rounded-xl bg-card/50 border border-border/50 focus:bg-background focus:border-primary/20 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/10 placeholder:text-muted-foreground/50"
                  />
                </div>
                <SidebarContent />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="max-w-3xl">
              {sections.find((s) => s.id === activeSection)?.content}
            </div>

            <div className="mt-20 pt-10 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <p>Last updated: Feb 11, 2026</p>
              <div className="flex gap-6">
                <Link
                  to="/privacy"
                  className="hover:text-primary transition-colors font-medium"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="hover:text-primary transition-colors font-medium"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
