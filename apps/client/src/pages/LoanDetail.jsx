import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Mail,
  User,
  Info,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Zap,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  ArrowUpCircle,
  Download,
  Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Tooltip from '@/components/ui/Tooltip';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';
import DocumentManager from '@/components/DocumentManager';
import StatsCard from '@/components/StatsCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import RepaymentCalendar from '@/components/RepaymentCalendar';

const LoanDetailSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="h-40 bg-card/30 rounded-[2.5rem] border border-border/50" />
    <div className="grid gap-6 md:grid-cols-3">
      <Skeleton className="h-32 rounded-[2rem]" />
      <Skeleton className="h-32 rounded-[2rem]" />
      <Skeleton className="h-32 rounded-[2rem]" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Skeleton className="lg:col-span-8 h-[600px] rounded-[2.5rem]" />
      <Skeleton className="lg:col-span-4 h-[400px] rounded-[2.5rem]" />
    </div>
  </div>
);

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [paidInstallmentsCount, setPaidInstallmentsCount] = useState(0);

  // Pagination State
  const [repaymentPage, setRepaymentPage] = useState(1);
  const [investmentPage, setInvestmentPage] = useState(1);
  const [hasMoreRepayments, setHasMoreRepayments] = useState(true);
  const [hasMoreInvestments, setHasMoreInvestments] = useState(true);
  const [isFetchingMoreRepayments, setIsFetchingMoreRepayments] =
    useState(false);
  const [isFetchingMoreInvestments, setIsFetchingMoreInvestments] =
    useState(false);
  const itemsPerPage = 3;

  const repaymentObserverTarget = useRef(null);
  const investmentObserverTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const loanRes = await api.get(`/loans/${id}`);
      setLoan(loanRes.data);

      const repaymentsRes = await api.get(`/repayments?loanId=${id}`);
      const allRepayments = repaymentsRes.data.data || [];

      // Calculate actual installments paid based on amount, not just record count
      const actualInstallmentsPaid = Math.min(
        Math.floor(loanRes.data.paidAmount / loanRes.data.emi),
        loanRes.data.duration,
      );
      setPaidInstallmentsCount(actualInstallmentsPaid);

      if (isMobile) {
        setRepayments(allRepayments.slice(0, itemsPerPage));
        setHasMoreRepayments(allRepayments.length > itemsPerPage);
      } else {
        setRepayments(allRepayments);
      }

      if (loanRes.data.customer?.isMember && loanRes.data.customer?.memberId) {
        const memberId = loanRes.data.customer.memberId;
        const memberRes = await api.get(`/members/${memberId}`);
        setMember(memberRes.data);

        const investmentsRes = await api.get(
          `/investments?memberId=${memberId}`,
        );
        const allInvestments = investmentsRes.data.data || [];
        if (isMobile) {
          setInvestments(allInvestments.slice(0, itemsPerPage));
          setHasMoreInvestments(allInvestments.length > itemsPerPage);
        } else {
          setInvestments(allInvestments);
        }
      }

      const upcomingRes = await api.get(`/loans/upcoming?loanId=${id}`);
      setUpcomingPayments(upcomingRes.data);

      setRepaymentPage(1);
      setInvestmentPage(1);
    } catch (error) {
      console.error('Failed to fetch loan details', error);
      toast.error('Failed to load loan info');
      navigate('/loans');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, isMobile]);

  const loadMoreRepayments = useCallback(async () => {
    if (isFetchingMoreRepayments || !hasMoreRepayments) return;

    setIsFetchingMoreRepayments(true);
    setTimeout(async () => {
      try {
        const { data } = await api.get(`/repayments?loanId=${id}`);
        const allRP = data.data || [];
        const nextPage = repaymentPage + 1;
        const start = (nextPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const newBatch = allRP.slice(start, end);

        if (newBatch.length > 0) {
          setRepayments((prev) => [...prev, ...newBatch]);
          setRepaymentPage(nextPage);
          setHasMoreRepayments(allRP.length > end);
        } else {
          setHasMoreRepayments(false);
        }
      } catch (error) {
        console.error('Failed to fetch more repayments', error);
      } finally {
        setIsFetchingMoreRepayments(false);
      }
    }, 500);
  }, [id, repaymentPage, hasMoreRepayments, isFetchingMoreRepayments]);

  const loadMoreInvestments = useCallback(async () => {
    if (isFetchingMoreInvestments || !hasMoreInvestments || !member) return;

    setIsFetchingMoreInvestments(true);
    setTimeout(async () => {
      try {
        const memberId = member._id || member;
        const { data } = await api.get(`/investments?memberId=${memberId}`);
        const allInv = data.data || [];
        const nextPage = investmentPage + 1;
        const start = (nextPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const newBatch = allInv.slice(start, end);

        if (newBatch.length > 0) {
          setInvestments((prev) => [...prev, ...newBatch]);
          setInvestmentPage(nextPage);
          setHasMoreInvestments(allInv.length > end);
        } else {
          setHasMoreInvestments(false);
        }
      } catch (error) {
        console.error('Failed to fetch more investments', error);
      } finally {
        setIsFetchingMoreInvestments(false);
      }
    }, 500);
  }, [member, investmentPage, hasMoreInvestments, isFetchingMoreInvestments]);

  // Infinite Scroll Observers
  useEffect(() => {
    if (!isMobile) return;

    const rpObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreRepayments &&
          hasMoreRepayments
        ) {
          loadMoreRepayments();
        }
      },
      { threshold: 1.0 },
    );

    if (repaymentObserverTarget.current) {
      rpObserver.observe(repaymentObserverTarget.current);
    }

    return () => rpObserver.disconnect();
  }, [
    isMobile,
    isFetchingMoreRepayments,
    hasMoreRepayments,
    loadMoreRepayments,
  ]);

  useEffect(() => {
    if (!isMobile) return;

    const invObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreInvestments &&
          hasMoreInvestments
        ) {
          loadMoreInvestments();
        }
      },
      { threshold: 1.0 },
    );

    if (investmentObserverTarget.current) {
      invObserver.observe(investmentObserverTarget.current);
    }

    return () => invObserver.disconnect();
  }, [
    isMobile,
    isFetchingMoreInvestments,
    hasMoreInvestments,
    loadMoreInvestments,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoanDetailSkeleton />;
  if (!loan) return null;

  const netBalance = member ? member.currentBalance || 0 : 0;
  const settlementStatus =
    netBalance >= loan.remainingAmount
      ? 'Full Settlement Possible'
      : 'Partial Settlement Possible';
  const progress = Math.min(
    Math.round((loan.paidAmount / loan.totalAmount) * 100),
    100,
  );

  const handleDownloadStatement = async () => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();

      // Ensure autoTable is initialized
      // @ts-ignore
      if (typeof doc.autoTable !== 'function') {
        // @ts-ignore
        try {
          autoTable(doc);
        } catch (e) {
          console.warn('AutoTable initialization warning:', e);
        }
      }

      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('FINANCIAL STATEMENT', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        27,
        { align: 'center' },
      );
      doc.line(20, 32, pageWidth - 20, 32);

      // Borrower Info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Borrower Information', 20, 42);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${loan.customer?.name}`, 20, 50);
      doc.text(`Email: ${loan.customer?.email}`, 20, 55);
      doc.text(`Phone: ${loan.customer?.phone || 'N/A'}`, 20, 60);
      if (member) {
        doc.text(`Membership ID: ${member._id}`, 20, 65);
      }

      // Loan Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Loan Agreement Summary', 20, 80);

      autoTable(doc, {
        startY: 85,
        head: [['Field', 'Detail']],
        body: [
          ['Loan ID', loan._id],
          ['Principal Amount', formatPKR(loan.principal)],
          ['Interest Rate', `${loan.rate}% APR`],
          ['Duration', `${loan.duration} Months`],
          ['Total Repayable', formatPKR(loan.totalAmount)],
          ['Amount Paid', formatPKR(loan.paidAmount)],
          ['Remaining Balance', formatPKR(loan.remainingAmount)],
          ['Status', loan.status.toUpperCase()],
          ['Start Date', new Date(loan.startDate).toLocaleDateString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Repayment History
      // @ts-ignore
      let currentY = (doc.lastAutoTable?.finalY || 150) + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Repayment History', 20, currentY);

      if (repayments.length > 0) {
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Date', 'Amount', 'Status']],
          body: repayments.map((rp) => [
            new Date(rp.date).toLocaleDateString(),
            formatPKR(rp.amount),
            'Confirmed',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No repayments recorded yet.', 20, currentY + 10);
        // @ts-ignore
        doc.lastAutoTable = { finalY: currentY + 10 };
      }

      // Investment History (If Member)
      if (member && investments.length > 0) {
        // @ts-ignore
        currentY = (doc.lastAutoTable?.finalY || currentY) + 15;
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Investment History', 20, currentY);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Date', 'Type', 'Amount', 'Description']],
          body: investments.map((inv) => [
            new Date(inv.date).toLocaleDateString(),
            inv.type.toUpperCase(),
            formatPKR(inv.amount),
            inv.description || '-',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - 30,
          doc.internal.pageSize.height - 10,
        );
        doc.text(
          'Official Financial Statement - Generated via Aurbitrage Loan Management SaaS',
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' },
        );
      }

      doc.save(
        `Statement_${loan._id.slice(-6).toUpperCase()}_${loan.customer?.name.replace(/\s+/g, '_')}.pdf`,
      );
      toast.success('Financial statement downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate statement');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900/50 p-5 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden">
        <ShieldCheck className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] text-primary pointer-events-none" />

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/loans')}
            className="p-3 rounded-full hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all group hidden sm:block"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tighter">
                Loan #{loan._id.slice(-6).toUpperCase()}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
                  loan.status === 'active'
                    ? 'bg-blue-500/10 text-blue-500'
                    : loan.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-red-500/10 text-red-500'
                }`}
              >
                {loan.status}
              </span>
            </div>
            <div className="flex gap-4 text-muted-foreground flex-col sm:flex-row items-start sm:items-center">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <User size={14} className="text-primary" />
                {loan.customer?.name}
              </div>
              <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20">
                <span className="text-amber-500">★</span>
                <span>
                  {(loan.customer?.trustRating || 5).toFixed(1)}/10 Trust
                </span>
              </div>
              <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar size={14} className="text-primary" />
                Issued {new Date(loan.startDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Send WhatsApp Reminder">
            <a
              href={generateWhatsAppLink(
                loan.customer?.phone,
                loan.customer?.name,
                loan.emi,
                new Date(),
                false,
              )}
              target="_blank"
              rel="noreferrer"
              className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95"
            >
              <MessageSquare size={20} />
            </a>
          </Tooltip>
          <Tooltip content="Send Email Reminder">
            <a
              href={generateEmailLink(
                loan.customer?.email,
                loan.customer?.name,
                loan.emi,
                new Date(),
                false,
              )}
              className="p-3 bg-primary/10 text-primary rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
            >
              <Mail size={20} />
            </a>
          </Tooltip>
          <Tooltip content="Download Statement">
            <button
              onClick={handleDownloadStatement}
              disabled={isExporting}
              className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            >
              <Download
                size={20}
                className={isExporting ? 'animate-bounce' : ''}
              />
            </button>
          </Tooltip>
          <Button
            onClick={() => navigate(`/customers/${loan.customer?._id}`)}
            variant="gradient"
            className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest gap-1 w-full sm:w-auto "
          >
            <Activity className="w-3.5 h-3.5" />
            Full Profile
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-4">
        <StatsCard
          title="Total Repayable"
          amount={formatPKR(loan.totalAmount)}
          icon={<DollarSign size={18} />}
          color="bg-primary/10 text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Monthly Installment"
          amount={formatPKR(
            loan.remainingAmount <= 0 || loan.status === 'completed'
              ? 0
              : paidInstallmentsCount < loan.duration
                ? loan.remainingAmount / (loan.duration - paidInstallmentsCount)
                : loan.emi,
          )}
          icon={<Zap size={18} />}
          color="bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
          badge={`${paidInstallmentsCount}/${loan.duration}`}
          badgeTooltip={`${paidInstallmentsCount} Installments Paid`}
          isGlass
        />
        <StatsCard
          title="Paid Amount"
          amount={formatPKR(loan.paidAmount || 0)}
          icon={<CheckCircle2 size={18} />}
          color="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          isGlass
        />
        <StatsCard
          title="Outstanding Balance"
          amount={formatPKR(loan.remainingAmount)}
          icon={<AlertCircle size={18} />}
          color="bg-red-500/10 text-red-600 border-red-500/20"
          isGlass
        />
      </div>

      {/* Calendar Section */}
      <div className="w-full">
        <RepaymentCalendar upcomingPayments={upcomingPayments} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: Repayment History */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">
                  Repayment Ledger
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Precise history of all settlements made against this loan.
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-2xl">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              {repayments.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                    Zero Repayments Registered
                  </p>
                </div>
              ) : (
                repayments.map((rp, i) => (
                  <div
                    key={rp._id}
                    className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <div className="text-sm font-black tracking-tight">
                          Repayment #{repayments.length - i}
                        </div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />{' '}
                          {new Date(rp.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-600">
                        +{formatPKR(rp.amount)}
                      </div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                        Status: Confirmed
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Infinite Scroll Trigger for Repayments */}
              {isMobile && hasMoreRepayments && (
                <div ref={repaymentObserverTarget}>
                  <InfiniteLoader isFetchingMore={isFetchingMoreRepayments} />
                </div>
              )}
            </div>
          </div>

          {/* Investment History Section (Only for Members) */}
          {member && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tighter">
                    Investment Ledger
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    History of deposits and earnings for this member.
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="space-y-4">
                {investments.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                      Zero Investments Registered
                    </p>
                  </div>
                ) : (
                  investments.map((inv, i) => (
                    <div
                      key={inv._id}
                      className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
                    >
                      <div className="flex items-center gap-5">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            inv.type === 'deposit'
                              ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white'
                              : 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
                          }`}
                        >
                          <ArrowUpCircle
                            size={22}
                            className={
                              inv.type === 'withdrawal' ? 'rotate-180' : ''
                            }
                          />
                        </div>
                        <div>
                          <div className="text-sm font-black tracking-tight">
                            {inv.type === 'deposit'
                              ? 'Capital Deposit'
                              : 'Fund Withdrawal'}
                          </div>
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />{' '}
                            {new Date(inv.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-black ${inv.type === 'deposit' ? 'text-blue-600' : 'text-orange-600'}`}
                        >
                          {inv.type === 'deposit' ? '+' : '-'}
                          {formatPKR(inv.amount)}
                        </div>
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          {inv.description || 'System Entry'}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Infinite Scroll Trigger for Investments */}
                {isMobile && hasMoreInvestments && (
                  <div ref={investmentObserverTarget}>
                    <InfiniteLoader
                      isFetchingMore={isFetchingMoreInvestments}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm">
            <DocumentManager
              loanId={loan._id}
              documents={loan.documents || []}
              onUpdate={fetchData}
            />
          </div>
        </div>

        {/* Sidebar: Financial Context & Settlement */}
        <div className="lg:col-span-4 space-y-8">
          {/* Agreement Terms */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 p-5 sm:p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              Agreement Parameters
              <Info size={12} />
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <DollarSign size={14} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Principal
                  </span>
                </div>
                <span className="font-black">{formatPKR(loan.principal)}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                    <Percent size={14} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Interest
                  </span>
                </div>
                <span className="font-black">
                  {loan.rate}%{' '}
                  <span className="text-[8px] opacity-60">APR</span>
                </span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-muted/20 border border-border/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Clock size={14} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Duration
                  </span>
                </div>
                <span className="font-black">
                  {loan.duration}{' '}
                  <span className="text-[8px] opacity-60">MONTHS</span>
                </span>
              </div>
            </div>
          </div>

          {/* Member Settlement View */}
          {member && (
            <div className="bg-white dark:bg-slate-900 border border-border/50 p-5 sm:p-8 rounded-[2.5rem] shadow-sm space-y-6 sm:space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Wallet className="w-24 h-24 text-primary" />
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-black tracking-tighter">
                  Settlement Analysis
                </h3>
              </div>

              <div className="space-y-6 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Total Member Balance
                  </span>
                  <span className="font-black text-foreground">
                    {formatPKR(member.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">
                    Outstanding Loan
                  </span>
                  <span className="font-black text-red-500">
                    ({formatPKR(loan.remainingAmount)})
                  </span>
                </div>

                <div className="pt-6 border-t border-border/50">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Net Position (Remains)
                      </p>
                      <p
                        className={`text-4xl font-black tracking-tighter ${netBalance >= loan.remainingAmount ? 'text-emerald-500' : 'text-orange-500'}`}
                      >
                        {formatPKR(netBalance - loan.remainingAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 sm:p-5 rounded-3xl border-2 flex items-center gap-4 transition-all ${
                    netBalance >= loan.remainingAmount
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                      : 'bg-orange-500/5 border-orange-500/20 text-orange-600'
                  }`}
                >
                  {netBalance >= loan.remainingAmount ? (
                    <CheckCircle2 className="shrink-0" />
                  ) : (
                    <AlertCircle className="shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-wider">
                      {settlementStatus}
                    </p>
                    <p className="text-[10px] font-medium opacity-80">
                      {netBalance >= loan.remainingAmount
                        ? 'This member has sufficient internal funds to completely settle this debt.'
                        : 'Current balance is insufficient for full settlement. Balance adjustment required.'}
                    </p>
                  </div>
                </div>

                {netBalance >= loan.remainingAmount && (
                  <Button
                    variant="success"
                    className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]"
                  >
                    Execute Internal Settlement
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Progress Card */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              Loan Maturity
              <Zap size={12} className="text-primary" />
            </h3>
            <div className="space-y-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-4xl font-black tracking-tighter">
                  {progress}%
                </span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1.5">
                  Recovered
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">
                {formatPKR(loan.paidAmount)} of {formatPKR(loan.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetail;
