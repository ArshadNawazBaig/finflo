import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  ShieldCheck,
  Mail,
  User,
  Search,
  ArrowLeft,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { cn, formatPKR } from '@/lib/utils';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import EmptyState from '@/components/ui/EmptyState';

// Local formatAmount is kept for layouts that split the symbol and value
const formatAmount = (amount) => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString();
};

// Generate PDF for loan details
const generateLoanPDF = (loan, customerName, businessName) => {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('Loan Details', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(businessName, 105, 30, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Customer Info
  let yPos = 55;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Customer Information', 20, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${customerName}`, 20, yPos);

  yPos += 7;
  doc.text(
    `Loan ID: ${loan.loanId || loan._id.slice(-6).toUpperCase()}`,
    20,
    yPos,
  );

  // Loan Details
  yPos += 15;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Loan Information', 20, yPos);

  yPos += 10;
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');

  const details = [
    ['Status:', loan.status.toUpperCase()],
    ['Principal Amount:', `Rs. ${loan.principal.toLocaleString()}`],
    ['Interest Rate:', `${loan.rate}%`],
    ['Duration:', `${loan.duration} Months`],
    ['Monthly EMI:', `Rs. ${loan.emi.toLocaleString()}`],
    ['Total Amount:', `Rs. ${loan.totalAmount.toLocaleString()}`],
    ['Start Date:', format(new Date(loan.startDate), 'MMMM dd, yyyy')],
  ];

  if (loan.status === 'active') {
    details.push([
      'Remaining Amount:',
      `Rs. ${loan.remainingAmount?.toLocaleString() || 'N/A'}`,
    ]);
    details.push([
      'Paid Amount:',
      `Rs. ${loan.paidAmount?.toLocaleString() || 'N/A'}`,
    ]);
  }

  details.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold');
    doc.text(label, 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(value, 80, yPos);
    yPos += 7;
  });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`,
    105,
    280,
    { align: 'center' },
  );

  // Save
  doc.save(`Loan_${loan.loanId || loan._id.slice(-6)}_Details.pdf`);
};

const LoanLookup = () => {
  const [scrollY, setScrollY] = useState(0);
  const [formData, setFormData] = useState({
    securityCode: '',
    email: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'securityCode' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await axios.post('/api/public/loan-lookup', formData);
      setResult(data);
      toast.success('Loans retrieved successfully');
    } catch (err) {
      console.error('Lookup error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to retrieve details. Please check your information.',
      );
      toast.error('Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const resetLookup = () => {
    setResult(null);
    setFormData({ securityCode: '', email: '', name: '' });
  };

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
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <span className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-200">
              Secure Loan Lookup
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 container mx-auto px-4 pt-32 pb-8 flex items-center justify-center">
        {!result ? (
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-8 space-y-2">
              <h1 className="text-3xl font-black tracking-tight">
                Check Your Loan Status
              </h1>
              <p className="text-muted-foreground">
                Enter your details and the business security code to view your
                active loans and repayment history.
              </p>
            </div>

            <Card className="glass dark:glass-dark border-border/50 shadow-xl rounded-[2rem] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />
              <CardContent className="p-8 pt-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="securityCode"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >
                        Business Security Code
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <Input
                          id="securityCode"
                          name="securityCode"
                          placeholder="e.g. ABC123"
                          value={formData.securityCode}
                          onChange={handleChange}
                          className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-blue-500/50 uppercase font-mono tracking-wider"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >
                        Full Name
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <Input
                          id="name"
                          name="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleChange}
                          className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-blue-500/50"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                      >
                        Email Address
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 focus:border-blue-500/50"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all text-sm uppercase tracking-wide"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Look Up Loans <Search className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm border border-border/50 p-6 rounded-[2rem]">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    {result.customer.name}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> {result.customer.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> {result.businessName}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={resetLookup}
                className="rounded-full"
              >
                New Search
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.loans.length > 0 ? (
                result.loans.map((loan) => (
                  <Card
                    key={loan._id}
                    className="group hover:shadow-lg transition-all duration-300 border-border/50 overflow-hidden relative flex flex-col"
                  >
                    <div
                      className={cn(
                        'absolute top-0 left-0 w-1 h-full transition-colors',
                        loan.status === 'active'
                          ? 'bg-emerald-500'
                          : loan.status === 'completed'
                            ? 'bg-blue-500'
                            : loan.status === 'rejected'
                              ? 'bg-red-500'
                              : 'bg-yellow-500',
                      )}
                    />
                    <CardHeader className="pb-3 pl-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Loan ID
                          </p>
                          <CardTitle className="text-lg font-bold font-mono mt-0.5">
                            #{loan.loanId || loan._id.slice(-6).toUpperCase()}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                              loan.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : loan.status === 'completed'
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : loan.status === 'rejected'
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'bg-yellow-500/10 text-yellow-600',
                            )}
                          >
                            {loan.status}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pl-6 flex-1 flex flex-col">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Principal Amount
                          </p>
                          <div className="text-2xl font-black text-primary flex items-baseline gap-1">
                            <span className="text-sm font-normal text-muted-foreground">
                              Rs.
                            </span>
                            {formatAmount(loan.principal)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-1">
                            Interest Rate
                          </p>
                          <div className="text-xl font-black text-blue-600">
                            {loan.rate}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">
                            Duration
                          </p>
                          <p className="font-semibold">
                            {loan.duration} Months
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">
                            Start Date
                          </p>
                          <p className="font-semibold">
                            {format(new Date(loan.startDate), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">
                            Monthly EMI
                          </p>
                          <p className="font-semibold">
                            Rs. {formatAmount(loan.emi)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-0.5">
                            Total Amount
                          </p>
                          <p className="font-semibold">
                            Rs. {formatAmount(loan.totalAmount)}
                          </p>
                        </div>
                      </div>

                      {loan.status === 'active' && (
                        <div className="pt-2">
                          <div className="flex justify-between text-xs mb-1.5 font-medium">
                            <span>Repayment Progress</span>
                            <span>
                              {Math.round(
                                (loan.paidAmount / loan.totalAmount) * 100,
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.round(
                                  (loan.paidAmount / loan.totalAmount) * 100,
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">
                                Paid Amount
                              </p>
                              <p className="font-semibold text-emerald-600">
                                Rs. {formatAmount(loan.paidAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-0.5">
                                Remaining
                              </p>
                              <p className="font-semibold text-orange-600">
                                Rs. {formatAmount(loan.remainingAmount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex-grow"></div>

                      <Button
                        size="sm"
                        className={cn(
                          'w-full rounded-xl text-white font-semibold hover:opacity-90 transition-opacity',
                          loan.status === 'active'
                            ? 'bg-emerald-500 hover:bg-emerald-500'
                            : loan.status === 'completed'
                              ? 'bg-blue-500 hover:bg-blue-500'
                              : loan.status === 'rejected'
                                ? 'bg-red-500 hover:bg-red-500'
                                : 'bg-yellow-500 hover:bg-yellow-500',
                        )}
                        onClick={() =>
                          generateLoanPDF(
                            loan,
                            result.customer.name,
                            result.businessName,
                          )
                        }
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No Loans Found"
                  description="We couldn't find any loan records associated with these details."
                  className="col-span-full border-none bg-card/30"
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">
        © 2026 LoanPortal System
      </footer>
    </div>
  );
};

export default LoanLookup;
