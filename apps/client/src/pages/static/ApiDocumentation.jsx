import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Copy,
  Check,
  ChevronLeft,
  Server,
  Lock,
  Database,
  Terminal,
  Users,
  CreditCard,
  Bell,
  MessageSquare,
  Globe,
  Layout,
  Menu,
  Shield,
  ArrowLeft,
  Book,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import api from '@/lib/axios';
import PageHeader from '@/components/PageHeader';

const Endpoint = ({ method, path, description, params }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodColor = {
    GET: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    POST: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    PUT: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    PATCH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className="p-6 rounded-[2rem] bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 font-mono">
          <span
            className={cn(
              'px-3 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider',
              methodColor[method],
            )}
          >
            {method}
          </span>
          <span className="text-sm font-bold text-foreground break-all">
            {path}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 hover:bg-muted"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {typeof description === 'string' ? description : description.text}
      </p>
      {params && (
        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Parameters
          </h4>
          <div className="space-y-2">
            {params.map((param, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
              >
                <div className="font-mono font-bold text-primary">
                  {param.name}
                  {param.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </div>
                <div className="text-muted-foreground">{param.type}</div>
                <div className="text-muted-foreground sm:col-span-1">
                  {param.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {description && description.response && (
        <div className="bg-slate-950 p-4 rounded-xl border border-border/50 overflow-hidden relative group/code">
          <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
            <div className="text-[10px] bg-white/10 text-white px-2 py-1 rounded">
              JSON
            </div>
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Response
          </h4>
          <pre className="text-xs text-slate-50 font-mono overflow-x-auto">
            <code>{JSON.stringify(description.response, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

const ApiDocumentation = () => {
  const [activeTab, setActiveTab] = useState('auth');

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const sidebarItems = [
    { id: 'auth', label: 'Authentication', icon: Lock },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'loans', label: 'Loans', icon: Database },
    { id: 'repayments', label: 'Repayments', icon: CreditCard },
    { id: 'members', label: 'Members', icon: Layout },
    { id: 'shares', label: 'Business Shares', icon: Database },
    { id: 'branches', label: 'Branch Management', icon: Globe },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'goals', label: 'Saving Goals', icon: Target },
    { id: 'reports', label: 'Regulatory Reports', icon: Book },
    { id: 'search', label: 'Global Search', icon: Globe },
    { id: 'activity', label: 'Activity Logs', icon: Terminal },
    { id: 'settings', label: 'System Settings', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support Center', icon: MessageSquare },
  ];

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );
  const [loading, setLoading] = useState(true);
  // State for scroll
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const isPro = user?.plan === 'Pro';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>

        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative mx-auto w-24 h-24 bg-card/50 backdrop-blur-sm rounded-3xl border border-border/50 flex items-center justify-center shadow-xl">
            <Lock className="w-10 h-10 text-primary" />
            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-1 rounded-full shadow-lg">
              Pro
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-black tracking-tight">
              API Access Restricted
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Full API documentation and access keys are available exclusively
              to <strong className="text-foreground">Pro Plan</strong> members.
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-4">
            <Link to="/pricing">
              <Button
                variant="gradient"
                className="w-full h-12 rounded-full font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                Upgrade to Pro
              </Button>
            </Link>
            <Link to="/documentation">
              <Button
                variant="ghost"
                className="w-full h-12 rounded-full font-black uppercase tracking-widest text-xs hover:bg-muted/50"
              >
                Go Back
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <nav className="space-y-1">
      {sidebarItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
            activeTab === item.id
              ? 'bg-primary/10 text-primary shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="w-4 h-4" />
            {item.label}
          </div>
          {activeTab === item.id && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
      <div className="pt-4 mt-4 border-t border-border/50">
        <Link to="/documentation">
          <button className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
            <div className="flex items-center gap-3">
              <ChevronLeft className="w-4 h-4" />
              Back to Docs
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
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto max-w-7xl px-4 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Sidebar Desktop */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center gap-3 px-4 mb-2">
                <Terminal className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-black tracking-tight">API Ref</h1>
              </div>
              <SidebarContent />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 max-w-4xl">
            <PageHeader
              title={sidebarItems.find((i) => i.id === activeTab)?.label}
              description={`Explore endpoints for ${sidebarItems.find((i) => i.id === activeTab)?.label.toLowerCase()} management.`}
              className="mb-10"
            />

            <div className="space-y-6">
              {activeTab === 'auth' && (
                <>
                  <Endpoint
                    method="POST"
                    path="/api/auth/register"
                    description={{
                      text: 'Register a new business account.',
                      response: {
                        _id: '65c3b...',
                        name: 'John Doe',
                        email: 'john@example.com',
                        role: 'user',
                        token: 'eyJhbG...',
                      },
                    }}
                    params={[
                      {
                        name: 'name',
                        type: 'string',
                        required: true,
                        desc: 'Full name',
                      },
                      {
                        name: 'email',
                        type: 'string',
                        required: true,
                        desc: 'Email address',
                      },
                      {
                        name: 'password',
                        type: 'string',
                        required: true,
                        desc: 'Password (min 6 chars)',
                      },
                      {
                        name: 'businessName',
                        type: 'string',
                        required: true,
                        desc: 'Name of the lending business',
                      },
                    ]}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/auth/login"
                    description={{
                      text: 'Login to get an access token.',
                      response: {
                        _id: '65c3b...',
                        name: 'John Doe',
                        email: 'john@example.com',
                        role: 'user',
                        businessName: 'Acme Loans',
                        securityCode: 'SEC-123',
                        token: 'eyJhbG...',
                      },
                    }}
                    params={[
                      {
                        name: 'email',
                        type: 'string',
                        required: true,
                        desc: 'Registered email',
                      },
                      {
                        name: 'password',
                        type: 'string',
                        required: true,
                        desc: 'Password',
                      },
                    ]}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/auth/me"
                    description={{
                      text: 'Get current user details.',
                      response: {
                        _id: '65c3b...',
                        name: 'John Doe',
                        email: 'john@example.com',
                        role: 'user',
                        plan: 'Basic',
                        customerCount: 15,
                        businessName: 'Acme Loans',
                      },
                    }}
                  />
                  <Endpoint
                    method="PUT"
                    path="/api/auth/updatedetails"
                    description={{
                      text: 'Update user profile details.',
                      response: {
                        success: true,
                        data: {
                          name: 'John Updated',
                          email: 'john@example.com',
                        },
                        message: 'User details updated successfully',
                      },
                    }}
                  />
                  <Endpoint
                    method="PUT"
                    path="/api/auth/updatepassword"
                    description={{
                      text: 'Update user password.',
                      response: {
                        success: true,
                        message: 'Password updated successfully',
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/auth/forgotpassword"
                    description={{
                      text: 'Request password reset email.',
                      response: { success: true, data: 'Email sent' },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/auth/2fa/generate"
                    description={{
                      text: 'Generate 2FA secret and QR code (Requires auth).',
                      response: {
                        qrCode: 'data:image/png;base64...',
                        secret: 'ABC...',
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/auth/login/verify-2fa"
                    description={{
                      text: 'Verify 2FA code during login flow.',
                      response: { token: 'eyJ...', user: { name: 'John' } },
                    }}
                    params={[
                      {
                        name: 'code',
                        type: 'string',
                        required: true,
                        desc: '6-digit TOTP code',
                      },
                    ]}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/auth/verify-email"
                    description={{
                      text: 'Verify email address with code.',
                      response: { success: true, message: 'Email verified' },
                    }}
                    params={[
                      {
                        name: 'code',
                        type: 'string',
                        required: true,
                        desc: 'Verification code',
                      },
                    ]}
                  />
                </>
              )}

              {activeTab === 'customers' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/customers"
                    description={{
                      text: 'List all customers with trust ratings and membership status.',
                      response: {
                        customers: [
                          {
                            _id: '65c2...',
                            name: 'Alice Smith',
                            phone: '+123456789',
                            trustRating: 8.5,
                            isMember: true,
                            memberId: '65c1...',
                            cnic: '12345-6789012-3',
                            status: 'Active',
                          },
                        ],
                        pagination: { page: 1, total: 100 },
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/customers"
                    description={{
                      text: 'Create a new customer with full KYC details.',
                      response: {
                        _id: 'cust_2',
                        name: 'Bob Smith',
                        email: 'bob@ex.com',
                        cnic: '12345-6789012-3',
                        status: 'Active',
                        savingAccountNumber: 'SAV-8827361524',
                      },
                    }}
                    params={[
                      {
                        name: 'name',
                        type: 'string',
                        required: true,
                        desc: 'Full Name',
                      },
                      {
                        name: 'email',
                        type: 'string',
                        required: true,
                        desc: 'Contact Email',
                      },
                      {
                        name: 'phone',
                        type: 'string',
                        required: true,
                        desc: 'Phone Number',
                      },
                      {
                        name: 'cnic',
                        type: 'string',
                        required: true,
                        desc: 'National ID (CNIC)',
                      },
                      { name: 'job', type: 'string', desc: 'Job/Occupation' },
                      {
                        name: 'monthlyIncome',
                        type: 'number',
                        desc: 'Monthly income amount',
                      },
                      {
                        name: 'signature',
                        type: 'string',
                        required: true,
                        desc: 'Base64 or URL of signature',
                      },
                    ]}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/customers/:id"
                    description={{
                      text: 'Get customer details by ID.',
                      response: {
                        _id: 'cust_1',
                        name: 'Alice',
                        email: 'alice@ex.com',
                        phone: '+1234567890',
                        loans: [],
                      },
                    }}
                  />
                  <Endpoint
                    method="PUT"
                    path="/api/customers/:id"
                    description={{
                      text: 'Update a customer.',
                      response: {
                        _id: 'cust_1',
                        name: 'Alice Updated',
                        email: 'alice@ex.com',
                      },
                    }}
                  />
                  <Endpoint
                    method="DELETE"
                    path="/api/customers/:id"
                    description={{
                      text: 'Delete a customer.',
                      response: { message: 'Customer removed' },
                    }}
                  />
                </>
              )}

              {activeTab === 'loans' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/loans"
                    description={{
                      text: 'List loans with risk assessments and delinquency status.',
                      response: {
                        loans: [
                          {
                            _id: '65c4...',
                            principal: 5000,
                            rate: 12,
                            interestType: 'emi',
                            status: 'active',
                            riskDetails: {
                              grade: 'A',
                              score: 85,
                              suggestion: 'Approve',
                            },
                            lateFeeAmount: 0,
                            remainingAmount: 4200,
                          },
                        ],
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/loans"
                    description={{
                      text: 'Create a new loan application. Now supports interest types and grantor requirements.',
                      response: {
                        _id: 'loan_2',
                        customer: 'cust_1',
                        principal: 1000,
                        term: 12,
                        rate: 5,
                        interestType: 'emi',
                        status: 'active',
                        grantor1: 'mem_1',
                        grantor1Status: 'pending',
                      },
                    }}
                    params={[
                      {
                        name: 'customerId',
                        type: 'string',
                        required: true,
                        desc: 'Customer ID',
                      },
                      {
                        name: 'amount',
                        type: 'number',
                        required: true,
                        desc: 'Loan principal amount',
                      },
                      {
                        name: 'term',
                        type: 'number',
                        required: true,
                        desc: 'Term in months',
                      },
                      {
                        name: 'rate',
                        type: 'number',
                        required: true,
                        desc: 'Interest rate %',
                      },
                      {
                        name: 'interestType',
                        type: 'string',
                        desc: 'simple or emi (default: simple)',
                      },
                      {
                        name: 'grantor1',
                        type: 'string',
                        desc: 'Member ID of first grantor',
                      },
                      {
                        name: 'grantor2',
                        type: 'string',
                        desc: 'Member ID of second grantor',
                      },
                    ]}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/loans/:id"
                    description={{
                      text: 'Get comprehensive loan details including repayment schedule and status history.',
                      response: {
                        _id: 'loan_1',
                        customer: {
                          _id: 'cust_1',
                          name: 'Alice Smith',
                          email: 'alice@example.com',
                        },
                        amount: 5000,
                        interestRate: 5,
                        term: 12,
                        paidAmount: 1000,
                        remainingAmount: 4250,
                        status: 'Active',
                        schedule: [
                          {
                            dueDate: '2026-03-01',
                            amount: 450,
                            status: 'Paid',
                            paidDate: '2026-03-01',
                          },
                          {
                            dueDate: '2026-04-01',
                            amount: 450,
                            status: 'Pending',
                          },
                        ],
                        documents: [
                          {
                            name: 'Loan Agreement.pdf',
                            url: 'https://...',
                            type: 'contract',
                          },
                        ],
                      },
                    }}
                  />
                  <Endpoint
                    method="PUT"
                    path="/api/loans/:id"
                    description={{
                      text: 'Update loan status or details.',
                      response: { _id: 'loan_1', status: 'Completed' },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/loans/:id/documents"
                    description={{
                      text: 'Upload loan document.',
                      response: {
                        message: 'Document uploaded successfully',
                        document: { name: 'contract.pdf', url: 'https://...' },
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/loans/bulk-approve"
                    description={{
                      text: 'Bulk approve selected loans (Admin only).',
                      response: { success: true, count: 5 },
                    }}
                    params={[
                      {
                        name: 'ids',
                        type: 'array',
                        required: true,
                        desc: 'Array of loan IDs',
                      },
                    ]}
                  />
                  <Endpoint
                    method="PATCH"
                    path="/api/loans/:id/grantor-status"
                    description={{
                      text: 'Update grantor approval for a loan request.',
                      response: { _id: 'loan_1', grantorStatus: 'Approved' },
                    }}
                  />
                </>
              )}

              {activeTab === 'repayments' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/repayments"
                    description={{
                      text: 'List repayments with principal/interest breakdown.',
                      response: {
                        repayments: [
                          {
                            _id: '65c5...',
                            amount: 500,
                            principalAmount: 420,
                            interestAmount: 80,
                            installmentNumber: 3,
                            date: '2026-02-14',
                          },
                        ],
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/repayments"
                    description={{
                      text: 'Record a new repayment. If triggered via fund movement deposit, it may auto-deduct from the deposited amount to settle active loan installments.',
                      response: {
                        _id: 'pay_2',
                        loan: 'loan_1',
                        amount: 500,
                        date: '2026-02-11',
                        type: 'Manual',
                      },
                    }}
                    params={[
                      {
                        name: 'loanId',
                        type: 'string',
                        required: true,
                        desc: 'Loan ID',
                      },
                      {
                        name: 'amount',
                        type: 'number',
                        required: true,
                        desc: 'Payment amount',
                      },
                      {
                        name: 'date',
                        type: 'date',
                        desc: 'Payment date (defaults to now)',
                      },
                    ]}
                  />
                </>
              )}

              {activeTab === 'members' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/members"
                    description={{
                      text: 'Get all members including their current credit limits and total invested amounts.',
                      response: [
                        {
                          _id: 'mem_1',
                          user: { name: 'John' },
                          status: 'Active',
                          totalInvested: 10000,
                          creditLimit: 5000,
                        },
                      ],
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members"
                    description={{
                      text: 'Create a new investor member.',
                      response: {
                        _id: 'mem_2',
                        email: 'investor@ex.com',
                        status: 'Active',
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/convert"
                    description={{
                      text: 'Convert a customer to a member.',
                      response: {
                        success: true,
                        message: 'Customer converted to member successfully',
                        member: { _id: 'mem_3', name: 'Converted Member' },
                      },
                    }}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/members/:id/investments"
                    description={{
                      text: 'Get member investments.',
                      response: [
                        { _id: 'inv_1', amount: 5000, date: '2026-01-01' },
                      ],
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/:id/invest"
                    description={{
                      text: 'Add investment.',
                      response: {
                        success: true,
                        data: { amount: 1000, status: 'pending' },
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/:id/withdraw"
                    description={{
                      text: 'Withdraw investment.',
                      response: {
                        success: true,
                        data: { amount: 500, status: 'pending' },
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/transfer"
                    description={{
                      text: 'Initiate a P2P transfer between members.',
                      response: {
                        success: true,
                        transactionId: 'txn_987...',
                        amount: 500,
                        recipient: 'Jane Smith',
                        timestamp: '2026-02-14T02:40:00Z',
                      },
                    }}
                    params={[
                      {
                        name: 'recipientEmail',
                        type: 'string',
                        required: true,
                        desc: 'Target member email',
                      },
                      {
                        name: 'amount',
                        type: 'number',
                        required: true,
                        desc: 'Amount to transfer',
                      },
                      {
                        name: 'note',
                        type: 'string',
                        desc: 'Optional transfer note',
                      },
                    ]}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/auth/login"
                    description={{
                      text: 'Member portal authentication.',
                      response: {
                        _id: 'mem_1',
                        name: 'Investor Bob',
                        email: 'bob@invest.com',
                        token: 'eyJ...',
                        role: 'member',
                      },
                    }}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/members/portal/activity"
                    description={{
                      text: 'Get personal activity log for the logged-in member.',
                      response: { data: [{ action: 'DEPOSIT', amount: 500 }] },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/self-register"
                    description={{
                      text: 'Public endpoint for members to register themselves. Requires full KYC data and signature.',
                      response: {
                        success: true,
                        message:
                          'Registration received, pending admin approval',
                      },
                    }}
                    params={[
                      {
                        name: 'name',
                        type: 'string',
                        required: true,
                        desc: 'Full Name',
                      },
                      {
                        name: 'email',
                        type: 'string',
                        required: true,
                        desc: 'Login Email',
                      },
                      {
                        name: 'password',
                        type: 'string',
                        required: true,
                        desc: 'Min 8 characters',
                      },
                      {
                        name: 'cnic',
                        type: 'string',
                        required: true,
                        desc: 'National ID (CNIC)',
                      },
                      {
                        name: 'phone',
                        type: 'string',
                        required: true,
                        desc: 'Phone Number',
                      },
                      {
                        name: 'signature',
                        type: 'string',
                        required: true,
                        desc: 'Signature data',
                      },
                    ]}
                  />
                </>
              )}

              {activeTab === 'shares' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/members/:id/shares"
                    description={{
                      text: 'Get business share investment details for a member. These investments are handled separately from main balances.',
                      response: [
                        {
                          _id: 'sh_1',
                          amount: 5000,
                          type: 'Investment',
                          status: 'Active',
                        },
                      ],
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/:id/share-invest"
                    description={{
                      text: 'Add a new share investment. Does not trigger auto-loan deduction.',
                      response: { success: true, amount: 1000 },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/distribute-share-profit"
                    description={{
                      text: 'Distribute business profits to share holders (Admin only). Profits are added to shareBalance.',
                      response: { success: true, totalDistributed: 25000 },
                    }}
                    params={[
                      {
                        name: 'totalAmount',
                        type: 'number',
                        required: true,
                        desc: 'Total amount to distribute',
                      },
                      {
                        name: 'description',
                        type: 'string',
                        desc: 'Note for the distribution record',
                      },
                    ]}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/members/portal/transfer"
                    description={{
                      text: 'P2P Fund Transfer between members. Deducts from sender main balance and adds to recipient main balance.',
                      response: { success: true, transactionId: 'trx_987' },
                    }}
                    params={[
                      {
                        name: 'recipientId',
                        type: 'string',
                        required: true,
                        desc: 'Recipient Member ID',
                      },
                      {
                        name: 'amount',
                        type: 'number',
                        required: true,
                        desc: 'Transfer amount',
                      },
                      {
                        name: 'note',
                        type: 'string',
                        desc: 'Optional transaction note',
                      },
                    ]}
                  />
                </>
              )}

              {activeTab === 'reports' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/reports/ifrs9"
                    description={{
                      text: 'Generate IFRS 9 ECL (Expected Credit Loss) report.',
                      response: {
                        totalECL: 15400,
                        stages: { 1: 12000, 2: 2000, 3: 1400 },
                      },
                    }}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/reports/basel3"
                    description={{
                      text: 'Generate Basel III capital adequacy and risk-weighted assets report.',
                      response: { car: 12.5, rwa: 5000000 },
                    }}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/reports/trial-balance"
                    description={{
                      text: 'Generate comprehensive financial trial balance.',
                      response: {
                        debits: 1000000,
                        credits: 1000000,
                        accounts: [],
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/reports/snapshots"
                    description={{
                      text: 'Save a regulatory snapshot for audit compliance.',
                      response: { success: true, snapshotId: 'snap_123' },
                    }}
                  />
                </>
              )}

              {activeTab === 'search' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/search"
                    description={{
                      text: 'Global search across Customers, Members, and Loans. Accessible by Staff and Members (restricted views).',
                      response: {
                        results: {
                          customers: [],
                          members: [],
                          loans: [],
                        },
                      },
                    }}
                    params={[
                      {
                        name: 'q',
                        type: 'string',
                        required: true,
                        desc: 'Search query',
                      },
                    ]}
                  />
                </>
              )}

              {activeTab === 'support' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/support"
                    description={{
                      text: 'Get my support tickets.',
                      response: [
                        {
                          _id: 'tick_1',
                          subject: 'Help with loan',
                          status: 'Open',
                          replies: [],
                        },
                      ],
                    }}
                  />
                </>
              )}

              {activeTab === 'activity' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/activity-logs"
                    description={{
                      text: 'List comprehensive system activity logs (Super Admin only). Includes before/after state snapshots.',
                      response: {
                        logs: [
                          {
                            _id: '65c3...',
                            user: { _id: 'u123', name: 'Admin User' },
                            action: 'UPDATE_LOAN_STATUS',
                            details: 'Status changed from Pending to Active',
                            metadata: {
                              loanId: '65c4...',
                              before: { status: 'Pending', rate: 5 },
                              after: { status: 'Active', rate: 5 },
                            },
                            ipAddress: '192.168.1.1',
                            userAgent: 'Mozilla/5.0...',
                            timestamp: '2026-02-14T02:30:00Z',
                          },
                        ],
                        pagination: { page: 1, total: 250, limit: 10 },
                      },
                    }}
                    params={[
                      { name: 'page', type: 'int', desc: 'Page number' },
                      {
                        name: 'action',
                        type: 'string',
                        desc: 'Filter by action type',
                      },
                      {
                        name: 'userId',
                        type: 'string',
                        desc: 'Filter by user',
                      },
                    ]}
                  />
                  <Endpoint
                    method="GET"
                    path="/api/activity-logs/user/:userId"
                    description={{
                      text: 'Get activity logs for a specific user profile.',
                      response: {
                        logs: [
                          {
                            _id: '65c5...',
                            action: 'LOGIN',
                            timestamp: '2026-02-14T01:00:00Z',
                          },
                        ],
                        total: 15,
                      },
                    }}
                  />
                </>
              )}

              {activeTab === 'settings' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/system-settings"
                    description={{
                      text: 'Get basic system settings.',
                      response: {
                        siteName: 'FinanceFlow',
                        maintenanceMode: false,
                        defaultInterestRate: 5,
                      },
                    }}
                  />
                  <Endpoint
                    method="PUT"
                    path="/api/system-settings"
                    description={{
                      text: 'Update system settings (Super Admin only).',
                      response: { success: true },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/system-settings/reset"
                    description={{
                      text: 'Reset settings to defaults (Super Admin only).',
                      response: { success: true },
                    }}
                  />
                </>
              )}

              {activeTab === 'reports' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/reports/stats"
                    description={{
                      text: 'Get summary statistics for reports.',
                      response: {
                        totalLoans: 154,
                        activeVolume: 850000,
                        repaymentRate: 98.2,
                      },
                    }}
                  />
                </>
              )}

              {activeTab === 'contact' && (
                <>
                  <Endpoint
                    method="POST"
                    path="/api/contact"
                    description={{
                      text: 'Send a contact message through the system.',
                      response: { success: true, message: 'Email sent' },
                    }}
                    params={[
                      {
                        name: 'name',
                        type: 'string',
                        required: true,
                        desc: 'Sender name',
                      },
                      {
                        name: 'email',
                        type: 'string',
                        required: true,
                        desc: 'Sender email',
                      },
                      {
                        name: 'subject',
                        type: 'string',
                        required: true,
                        desc: 'Message subject',
                      },
                      {
                        name: 'message',
                        type: 'string',
                        required: true,
                        desc: 'Message content',
                      },
                    ]}
                  />
                </>
              )}

              {activeTab === 'support' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/support"
                    description={{
                      text: 'Get my support tickets.',
                      response: [
                        {
                          _id: 'tick_1',
                          subject: 'Help with loan',
                          status: 'Open',
                          replies: [],
                        },
                      ],
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/support"
                    description={{
                      text: 'Create a support ticket.',
                      response: {
                        _id: 'tick_2',
                        subject: 'Bug report',
                        status: 'Open',
                      },
                    }}
                  />
                  <Endpoint
                    method="POST"
                    path="/api/support/:id/reply"
                    description={{
                      text: 'Reply to a ticket.',
                      response: {
                        _id: 'tick_1',
                        replies: [{ text: 'Thanks!' }],
                      },
                    }}
                  />
                </>
              )}

              {activeTab === 'notifications' && (
                <>
                  <Endpoint
                    method="GET"
                    path="/api/notifications"
                    description={{
                      text: 'Get paginated notifications for the current user.',
                      response: {
                        notifications: [
                          {
                            _id: 'notif_1',
                            title: 'Loan Approved',
                            message:
                              'Your loan request for $5,000 has been approved.',
                            type: 'info',
                            read: false,
                            createdAt: '2026-02-14T02:00:00Z',
                          },
                        ],
                        pagination: {
                          page: 1,
                          pages: 5,
                          total: 48,
                          limit: 10,
                        },
                        unreadCount: 3,
                      },
                    }}
                    params={[
                      {
                        name: 'page',
                        type: 'int',
                        desc: 'Page number (default: 1)',
                      },
                      {
                        name: 'limit',
                        type: 'int',
                        desc: 'Items per page (default: 10)',
                      },
                      {
                        name: 'search',
                        type: 'string',
                        desc: 'Filter by title/message',
                      },
                      {
                        name: 'sortBy',
                        type: 'string',
                        desc: 'newest or oldest',
                      },
                    ]}
                  />
                  <Endpoint
                    method="PUT"
                    path="/api/notifications/:id/read"
                    description={{
                      text: 'Mark notification as read.',
                      response: { _id: 'notif_1', read: true },
                    }}
                  />
                </>
              )}

              {activeTab === 'public' && (
                <>
                  <Endpoint
                    method="POST"
                    path="/api/public/loan-lookup"
                    description={{
                      text: 'Public loan lookup for customers.',
                      response: {
                        loans: [
                          { _id: 'loan_1', amount: 5000, status: 'Active' },
                        ],
                        customer: { name: 'Alice' },
                      },
                    }}
                    params={[
                      {
                        name: 'securityCode',
                        type: 'string',
                        required: true,
                        desc: 'Unique security code',
                      },
                    ]}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocumentation;
