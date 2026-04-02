import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
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
import { cn, formatCNIC } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthLayout from '@/layouts/AuthLayout';
import { renderPdfHeader, renderPdfFooter, toTitleCase, renderPdfSignatures, getBusinessContext } from '@/lib/pdfExportUtils';
import { formatCurrency } from '@/lib/utils';

// Local formatAmount is kept for layouts that split the symbol and value
const formatAmount = (amount) => {
  amount = Math.round(amount);
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  return amount.toLocaleString();
};

// Generate PDF for loan details
const generateLoanPDF = async (loan, customerName, businessName) => {
  const doc = new jsPDF();

  const ctx = {
    businessName: businessName || 'FinFlo',
    businessLogo: '',
    businessAddress: '',
  };

  const startY = await renderPdfHeader(doc, {
    businessContext: ctx,
    title: 'Loan Details Report',
    leftDetails: [
      { label: 'Customer Name', value: toTitleCase(customerName) },
      { label: 'Loan ID', value: loan.loanId || loan._id.slice(-6).toUpperCase() },
      { label: 'Status', value: loan.status.toUpperCase() },
    ],
    rightDetails: [
      { label: 'Generated On', value: format(new Date(), 'MMMM dd, yyyy') },
      { label: 'Interest Rate', value: `${loan.rate}%` },
      { label: 'Duration', value: `${loan.duration} Months` },
    ],
  });

  const details = [
    ['Principal Amount', formatCurrency(loan.principal)],
    ['Interest Rate', `${loan.rate}%`],
    ['Duration', `${loan.duration} Months`],
    ['Monthly EMI', formatCurrency(loan.emi)],
    ['Total Amount', formatCurrency(loan.totalAmount)],
    ['Start Date', format(new Date(loan.startDate), 'MMMM dd, yyyy')],
  ];

  if (loan.status === 'active') {
    details.push(['Remaining Amount', formatCurrency(loan.remainingAmount || 0)]);
    details.push(['Paid Amount', formatCurrency(loan.paidAmount || 0)]);
  }

  autoTable(doc, {
    startY,
    head: [['Description', 'Detail']],
    body: details,
    theme: 'grid',
    headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable?.finalY || startY + 20;
  await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });

  renderPdfFooter(doc, { businessContext: ctx });

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

  if (result) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
        {/* Dynamic Background Blobs */}
        <div className="absolute top-0 -left-10 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
        <div className="absolute top-0 -right-10 w-96 h-96 bg-emerald-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

        <main className="relative z-10 flex-1 container mx-auto px-6 py-12 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border border-white/20 dark:border-white/5 p-6 rounded-2xl shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight capitalize">
                  {result.customer.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                  Verified Holder
                </span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-primary" />
                  {result.customer.email}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  {result.businessName}
                </div>
              </div>
            </div>
            <Button
              variant="gradient"
              onClick={resetLookup}
              className="rounded-full px-8 h-12 font-black uppercase tracking-widest text-[10px] shadow-xs"
            >
              Perform New Search
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {result.loans.length > 0 ? (
              result.loans.map((loan) => (
                <Card
                  key={loan._id}
                  className="group hover:-translate-y-1 transition-all duration-300 border-white/20 dark:border-white/5 overflow-hidden relative flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-xs hover:shadow-md"
                >
                  <div
                    className={cn(
                      'absolute top-0 left-0 w-1.5 h-full transition-colors',
                      loan.status === 'active'
                        ? 'bg-emerald-500'
                        : loan.status === 'completed'
                          ? 'bg-blue-500'
                          : loan.status === 'rejected'
                            ? 'bg-red-500'
                            : 'bg-yellow-500',
                    )}
                  />
                  <CardHeader className="pb-3 pt-6 px-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Loan Identity
                        </p>
                        <CardTitle className="text-xl font-black font-mono mt-1">
                          #{loan.loanId || loan._id.slice(-6).toUpperCase()}
                        </CardTitle>
                      </div>
                      <div
                        className={cn(
                          'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest',
                          loan.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : loan.status === 'completed'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : loan.status === 'rejected'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
                        )}
                      >
                        {loan.status}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-6 pb-6 flex-1 flex flex-col text-sm">
                    <div className="flex items-end justify-between border-b border-border/50 pb-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                          Principal Amount
                        </p>
                        <div className="text-2xl font-black text-primary tracking-tighter flex items-baseline gap-1">
                          {formatAmount(loan.principal)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                          Interest Rate
                        </p>
                        <div className="text-xl font-black text-blue-500 tracking-tight">
                          {loan.rate}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs">
                      <div>
                        <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.15em] mb-1">
                          Duration
                        </p>
                        <p className="font-bold text-sm tracking-tight">
                          {loan.duration}{' '}
                          <span className="text-[10px] text-muted-foreground">
                            Months
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.15em] mb-1">
                          Start Date
                        </p>
                        <p className="font-bold text-sm tracking-tight">
                          {format(new Date(loan.startDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.15em] mb-1">
                          Monthly EMI
                        </p>
                        <p className="font-bold text-sm tracking-tight">
                          {formatAmount(loan.emi)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.15em] mb-1">
                          Total Value
                        </p>
                        <p className="font-bold text-sm tracking-tight text-primary">
                          {formatAmount(loan.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {loan.status === 'active' && (
                      <div className="pt-4 space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-muted-foreground">
                              Repayment Lifecycle
                            </span>
                            <span className="text-primary">
                              {Math.round(
                                (loan.paidAmount / loan.totalAmount) * 100,
                              )}
                              %
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden border border-border/50">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-1000"
                              style={{
                                width: `${Math.round((loan.paidAmount / loan.totalAmount) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600/70 mb-0.5">
                              Settled
                            </p>
                            <p className="font-black text-emerald-600 text-sm">
                              {formatAmount(loan.paidAmount)}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-orange-600/70 mb-0.5">
                              Outstanding
                            </p>
                            <p className="font-black text-orange-600 text-sm">
                              {formatAmount(loan.remainingAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex-grow min-h-[20px]"></div>

                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl font-black text-[9px] uppercase tracking-widest border-border/50 hover:bg-muted/50 transition-all group/btn shadow-xs"
                      onClick={() =>
                        generateLoanPDF(
                          loan,
                          result.customer.name,
                          result.businessName,
                        )
                      }
                    >
                      <Download className="w-4 h-4 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" />
                      Download PDF Report
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={FileText}
                title="No Loans Found"
                description="We couldn't find any loan records associated with these details."
                className="col-span-full border-white/20 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl py-12 shadow-xs"
              />
            )}
          </div>
        </main>

        <footer className="relative z-10 py-10 text-center border-t border-border/50 bg-background/50 backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-30">
            © 2026 Financial Flow Intelligence Portal • Immutable Records
          </p>
        </footer>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Loan Lookup"
      description="Verify your active loans and schedules instantly with your security credentials."
      badge="Direct Verification"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-black uppercase tracking-widest p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="securityCode"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            >
              Organization Security Code
            </Label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-500">
                <ShieldCheck size={16} className="text-muted-foreground" />
              </div>
              <input
                id="securityCode"
                name="securityCode"
                placeholder="E.G. ABC123"
                value={formData.securityCode}
                onChange={handleChange}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-emerald-500/50 focus:bg-background transition-all outline-none text-sm font-mono font-bold uppercase tracking-widest placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                maxLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="cnic"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
            >
              Registered CNIC / ID
            </Label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                <Fingerprint size={16} className="text-muted-foreground" />
              </div>
              <input
                id="cnic"
                name="cnic"
                placeholder="00000-0000000-0"
                value={formData.cnic}
                onChange={handleChange}
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/20 border border-border focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                required
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          variant="gradient"
          className="h-12 w-full rounded-xl font-black text-[10px] uppercase tracking-widest group relative overflow-hidden shadow-xs mt-4"
        >
          <span className="flex items-center justify-center gap-2">
            Execute Search
            <Search
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
          </span>
        </Button>
      </form>

      <div className="pt-8 border-t border-border flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground font-medium text-center">
          Need specialized access?{' '}
          <Link
            to="/member/login"
            className="text-primary font-black hover:underline"
          >
            Member Portal
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoanLookup;
