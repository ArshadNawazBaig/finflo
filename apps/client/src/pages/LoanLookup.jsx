import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  ShieldCheck,
  Search,
  AlertCircle,
  FileText,
  Download,
  Fingerprint,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { format } from 'date-fns';
import { cn, formatPKR, formatCNIC } from '@/lib/utils';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import EmptyState from '@/components/ui/EmptyState';
import Logo from '@/components/Logo';

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
  const [formData, setFormData] = useState({
    securityCode: '',
    cnic: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cnic') {
      setFormData((prev) => ({
        ...prev,
        cnic: formatCNIC(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'securityCode' ? value.toUpperCase() : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await api.post('/public/loan-lookup', formData);
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
    setFormData({ securityCode: '', cnic: '' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden selection:bg-primary/20">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <main className="relative z-10 flex-1 container mx-auto px-4 pt-10 pb-20 flex items-center justify-center">
        {!result ? (
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700 delay-100">
            <Card className="glass dark:glass-dark border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-emerald-400 to-primary/50" />

              <CardHeader className="space-y-4 pt-12 px-8 text-center flex flex-col items-center">
                <Link to="/" className="mb-2">
                  <Logo showText={false} className="h-12" />
                </Link>
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Loan Lookup
                  </CardTitle>
                  <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                    Verify your active loans and schedules instantly
                  </p>
                </div>
              </CardHeader>

              <CardContent className="px-8 pb-12 pt-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="securityCode"
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1"
                      >
                        Business Security Code
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                          id="securityCode"
                          name="securityCode"
                          placeholder="E.G. ABC123"
                          value={formData.securityCode}
                          onChange={handleChange}
                          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium uppercase tracking-widest"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="cnic"
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1"
                      >
                        CNIC Number
                      </Label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                          <Fingerprint className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                          id="cnic"
                          name="cnic"
                          placeholder="00000-0000000-0"
                          value={formData.cnic}
                          onChange={handleChange}
                          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    variant="gradient"
                    className="h-12 w-full rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] group relative overflow-hidden"
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300',
                        loading ? 'opacity-0' : 'opacity-100',
                      )}
                    >
                      Execute Lookup <Search className="w-4 h-4" />
                    </span>
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 animate-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <span className="text-primary capitalize">
                    {result.customer.name}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                    Verified
                  </span>
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                      <Mail size={12} />
                    </div>
                    {result.customer.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck size={12} />
                    </div>
                    {result.businessName}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={resetLookup}
                className="rounded-full px-8 border-primary/20 hover:bg-primary/5 text-primary font-black uppercase tracking-widest text-[10px] h-12"
              >
                New Search
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {result.loans.length > 0 ? (
                result.loans.map((loan) => (
                  <Card
                    key={loan._id}
                    className="group hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border-white/20 dark:border-slate-800/50 overflow-hidden relative flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem]"
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
                  className="col-span-full border-white/20 dark:border-slate-800/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-sm"
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <div className="relative z-10 py-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-20 px-4">
          © 2026 Financial Intelligence Portal • Integrity via Technology
        </p>
      </div>
    </div>
  );
};

export default LoanLookup;
