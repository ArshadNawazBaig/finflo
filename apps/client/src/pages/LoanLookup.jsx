import { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Search,
  Loader2,
  Lock,
  Mail,
  User,
  AlertCircle,
  Download,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LoanLookup = () => {
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pin || !email || !name) {
      toast.error('All fields are required');
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN must be 6 digits');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/public/loan-lookup', {
        pin,
        email: email.toLowerCase(),
        name,
      });

      setCustomerData(data);
      toast.success('Loans retrieved successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to retrieve loans');
      setCustomerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPin('');
    setEmail('');
    setName('');
    setCustomerData(null);
  };

  const generatePDF = (loan) => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(33, 33, 33);
      doc.text('Loan Verification Statement', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      // Detailed Customer Info
      doc.setFontSize(12);
      doc.setTextColor(33, 33, 33);
      doc.text(`Customer Name: ${customerData.customer.name}`, 14, 40);
      doc.text(`Email Address: ${customerData.customer.email}`, 14, 46);
      if (customerData.customer.phone) {
        doc.text(`Phone Number: ${customerData.customer.phone}`, 14, 52);
      }

      // Installment Calculations
      const paidInstallments = Math.floor(loan.paidAmount / loan.emi);
      const remainingInstallments = loan.duration - paidInstallments;

      // Loan Details Table
      autoTable(doc, {
        startY: 60,
        head: [['Loan Details', 'Value']],
        body: [
          ['Loan ID', loan._id.toUpperCase()],
          ['Current Status', loan.status.toUpperCase()],
          ['Start Date', new Date(loan.startDate).toLocaleDateString()],
          ['Principal Amount', formatPKR(loan.principal)],
          ['Total Repayment Amount', formatPKR(loan.totalAmount)],
          ['Total Amount Paid', formatPKR(loan.paidAmount)],
          ['Remaining Balance', formatPKR(loan.remainingAmount)],
          [
            'Interest Rate',
            `${loan.interestRate}% (${loan.interestType || 'Simple'})`,
          ],
          ['Loan Duration', `${loan.duration} Months`],
          ['Monthly EMI', formatPKR(loan.emi)],
          ['Installments Paid', `${paidInstallments} / ${loan.duration}`],
          ['Installments Remaining', `${remainingInstallments}`],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
        }, // Indigo-600
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 10, cellPadding: 8, overflow: 'linebreak' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 'auto' },
        },
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'This document is electronically generated and is valid without a signature.',
        14,
        finalY,
      );
      doc.text(
        '© 2026 LoanMaster Financial Services. All rights reserved.',
        14,
        finalY + 5,
      );

      doc.save(`Loan_Statement_${loan._id.slice(-6)}.pdf`);
      toast.success('Loan statement downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden selection:bg-primary/20 font-sans">
      {/* Dynamic Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse animation-delay-2000" />
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse animation-delay-4000" />
      </div>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrollY > 20
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 py-3 shadow-md'
            : 'py-6 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-primary shadow-lg shadow-primary/20 rounded-xl flex items-center justify-center text-primary-foreground font-black group-hover:scale-105 transition-all duration-300">
              <ArrowLeft size={18} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
              Return Home
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-card/50 backdrop-blur-md rounded-xl flex items-center justify-center shadow-sm border border-border/50">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="hidden sm:block text-xs font-bold text-muted-foreground">
              Secure Portal
            </span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 min-h-screen flex flex-col items-center pt-28 pb-12 px-4">
        {!customerData ? (
          <Card className="w-full max-w-md relative glass dark:glass-dark border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-indigo-600 to-purple-600" />

            <CardHeader className="space-y-4 pt-10 px-8 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm group">
                <Search className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Track Your Loan
                </CardTitle>
                <p className="text-muted-foreground text-sm font-medium">
                  Enter your details to view loan status
                </p>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-10 pt-2">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* PIN Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Business PIN
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="6-digit PIN"
                      maxLength={6}
                      className="w-full h-12 pl-11 pr-10 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full h-12 pl-11 pr-4 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="gradient"
                  className="h-12 w-full rounded-full font-black text-[11px] uppercase tracking-widest group shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      View My Loans
                    </div>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-xs text-muted-foreground">
                    Don't have the PIN?{' '}
                    <span className="text-primary font-bold cursor-pointer hover:underline">
                      Contact your business owner
                    </span>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Customer Header */}
            <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-sm mb-12 relative overflow-hidden group w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 ring-4 ring-white/10 p-1">
                    <div className="w-full h-full rounded-xl border-2 border-white/20 flex items-center justify-center bg-white/10">
                      <User size={32} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground mb-2">
                      {customerData.customer.name}
                    </h2>
                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-sm font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full border border-border/50 transition-colors hover:border-primary/30 hover:bg-primary/5">
                        <Mail size={14} className="text-primary" />
                        {customerData.customer.email}
                      </span>
                      {customerData.customer.phone && (
                        <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-full border border-border/50 transition-colors hover:border-primary/30 hover:bg-primary/5">
                          <User size={14} className="text-primary" />
                          {customerData.customer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
                    <span className="text-[10px] uppercase font-black tracking-widest text-amber-600/70 mb-0.5">
                      Trust Score
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-3xl font-black text-amber-500 tracking-tight">
                        {customerData.customer.trustRating.toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-amber-600/70 translate-y-1">
                        / 10
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="icon"
                    className="rounded-full w-14 h-14 bg-background/50 border-border/50 hover:bg-background hover:text-primary transition-all shadow-sm group/btn"
                    title="New Search"
                  >
                    <Search
                      size={22}
                      className="group-hover/btn:scale-110 transition-transform"
                    />
                  </Button>
                </div>
              </div>
            </div>

            {/* Loans Grid - Compact Layout (4 per row) */}
            {customerData.loans.length === 0 ? (
              <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-[2.5rem] p-16 text-center flex flex-col items-center justify-center min-h-[400px] max-w-4xl mx-auto">
                <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6 animate-bounce duration-3000">
                  <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  No active loans found
                </h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  We couldn't find any loan records associated with these
                  credentials.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                {customerData.loans.map((loan) => {
                  const progress = Math.min(
                    100,
                    (loan.paidAmount / loan.totalAmount) * 100,
                  );
                  const isCompleted = loan.status === 'completed';
                  const isActive = loan.status === 'active';

                  const paidInstallments = Math.floor(
                    loan.paidAmount / loan.emi,
                  );
                  const remainingInstallments =
                    loan.duration - paidInstallments;

                  return (
                    <div
                      key={loan._id}
                      className="bg-card/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group relative flex flex-col h-full"
                    >
                      {/* Status Gradient Bar */}

                      <div className="flex justify-between items-start mb-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : isActive
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}
                        >
                          {loan.status}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                          {new Date(loan.startDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                          Principal Amount
                        </p>
                        <h3 className="text-2xl font-black tracking-tight text-foreground">
                          {formatPKR(loan.principal)}
                        </h3>
                      </div>

                      {/* Progress Section */}
                      <div className="mb-6 bg-muted/30 p-4 rounded-2xl border border-border/50">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Paid
                            </p>
                            <p className="text-sm font-bold text-emerald-600">
                              {formatPKR(loan.paidAmount)}
                            </p>
                          </div>
                          <span className="text-lg font-black text-primary">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-background rounded-full overflow-hidden shadow-inner border border-border/50">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                              isCompleted
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                : isActive
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                  : 'bg-gradient-to-r from-amber-400 to-orange-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats Compact Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6 flex-grow">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground">
                            Remaining
                          </p>
                          <p
                            className={`text-sm font-black ${loan.remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
                          >
                            {formatPKR(loan.remainingAmount)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground">
                            EMI
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {formatPKR(loan.emi)}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground">
                            Paid Inst.
                          </p>
                          <p className="text-sm font-bold text-emerald-600">
                            {paidInstallments} / {loan.duration}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground">
                            Remaining Inst.
                          </p>
                          <p className="text-sm font-bold text-amber-600">
                            {remainingInstallments}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-muted-foreground">
                            Interest
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {loan.interestRate}%
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => generatePDF(loan)}
                        variant="outline"
                        className={`w-full rounded-xl border-border/50 transition-all group/pdf ${
                          isCompleted
                            ? 'hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                            : isActive
                              ? 'hover:bg-blue-600 hover:text-white hover:border-blue-600'
                              : 'hover:bg-amber-500 hover:text-white hover:border-amber-500'
                        }`}
                      >
                        <Download
                          size={16}
                          className="mr-2 group-hover/pdf:animate-bounce"
                        />
                        <span className="text-xs font-bold uppercase tracking-wide">
                          Download PDF
                        </span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Minimal Footer */}
        <div className="mt-auto w-full text-center pt-8 pointer-events-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 px-4">
            © 2026 Financial Intelligence Portal • Precision in every
            transaction
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoanLookup;
