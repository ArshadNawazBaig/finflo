import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Pagination from '@/components/ui/Pagination';
import {
  Wallet,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Pencil,
  Mail,
  Zap,
  ArrowLeft,
  Calendar,
  Clock,
  ChevronRight,
  User,
  Info,
  X,
  FileText,
  Download,
  Loader2,
  Briefcase,
  ShieldCheck,
  FileCheck,
  FileBadge,
  Send,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import api from '@/lib/axios';
import { formatPKR, capitalize } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';

const MemberProfileSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex justify-between items-center bg-card/30 p-5 sm:p-8 rounded-[2.5rem] border border-border/50">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-32 rounded-full" />
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
    </div>
  </div>
);

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [profits, setProfits] = useState([]);
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [showProfitRateForm, setShowProfitRateForm] = useState(false);
  const [investmentType, setInvestmentType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [newProfitRate, setNewProfitRate] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: '',
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Pagination State
  const [investmentPage, setInvestmentPage] = useState(1);
  const [loanPage, setLoanPage] = useState(1);
  const [hasMoreInvestments, setHasMoreInvestments] = useState(true);
  const [hasMoreLoans, setHasMoreLoans] = useState(true);
  const [investmentTotalPages, setInvestmentTotalPages] = useState(1);
  const [investmentTotal, setInvestmentTotal] = useState(0);
  const [isFetchingMoreInvestments, setIsFetchingMoreInvestments] =
    useState(false);
  const [isFetchingMoreLoans, setIsFetchingMoreLoans] = useState(false);
  const itemsPerPage = 5;

  const investmentObserverTarget = useRef(null);
  const loanObserverTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMemberData = useCallback(async () => {
    try {
      setLoading(true);
      const [memberRes, investmentsRes, profitsRes] = await Promise.all([
        api.get(`/members/${id}`),
        api.get(`/members/${id}/investments?page=1&limit=${itemsPerPage}`),
        api.get(`/members/${id}/profits`),
      ]);
      setMember(memberRes.data);
      setEditForm({
        name: memberRes.data.name || '',
        email: memberRes.data.email || '',
        phone: memberRes.data.phone || '',
        address: memberRes.data.address || '',
        status: memberRes.data.status || '',
      });

      const investmentData = investmentsRes.data || {};
      setInvestments(investmentData.investments || []);
      setInvestmentTotalPages(investmentData.totalPages || 1);
      setInvestmentTotal(investmentData.total || 0);
      setHasMoreInvestments(
        investmentData.currentPage < investmentData.totalPages,
      );

      setProfits(profitsRes.data || []);

      if (memberRes.data.customer) {
        const customerId =
          memberRes.data.customer._id || memberRes.data.customer;
        const [loansRes, repaymentsRes] = await Promise.all([
          api.get(`/loans?customerId=${customerId}`),
          api.get(`/repayments?customerId=${customerId}`),
        ]);

        const allLoans = loansRes.data.data || [];
        if (isMobile) {
          setLoans(allLoans.slice(0, itemsPerPage));
          setHasMoreLoans(allLoans.length > itemsPerPage);
        } else {
          setLoans(allLoans);
        }

        setRepayments(repaymentsRes.data.data || []);
      }

      setNewProfitRate(memberRes.data.profitRate || '');
      setInvestmentPage(1);
      setLoanPage(1);
    } catch (error) {
      console.error('Failed to fetch member data', error);
      toast.error('Failed to load member profile');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, isMobile]);

  const loadMoreInvestments = useCallback(async () => {
    if (isFetchingMoreInvestments || !hasMoreInvestments) return;

    setIsFetchingMoreInvestments(true);
    try {
      const nextPage = investmentPage + 1;
      const { data } = await api.get(
        `/members/${id}/investments?page=${nextPage}&limit=${itemsPerPage}`,
      );

      if (data.investments?.length > 0) {
        setInvestments((prev) => [...prev, ...data.investments]);
        setInvestmentPage(nextPage);
        setHasMoreInvestments(data.currentPage < data.totalPages);
      } else {
        setHasMoreInvestments(false);
      }
    } catch (error) {
      console.error('Failed to fetch more investments', error);
    } finally {
      setIsFetchingMoreInvestments(false);
    }
  }, [id, investmentPage, hasMoreInvestments, isFetchingMoreInvestments]);

  const handleInvestmentPageChange = async (newPage) => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/members/${id}/investments?page=${newPage}&limit=${itemsPerPage}`,
      );
      setInvestments(data.investments || []);
      setInvestmentPage(newPage);
      setHasMoreInvestments(data.currentPage < data.totalPages);
    } catch (error) {
      toast.error('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLoans = useCallback(async () => {
    if (isFetchingMoreLoans || !hasMoreLoans || !member?.customer) return;

    setIsFetchingMoreLoans(true);
    setTimeout(async () => {
      try {
        const customerId = member.customer._id || member.customer;
        const { data } = await api.get(`/loans?customerId=${customerId}`);
        const allLoans = data.data || [];
        const nextPage = loanPage + 1;
        const start = (nextPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const newBatch = allLoans.slice(start, end);

        if (newBatch.length > 0) {
          setLoans((prev) => [...prev, ...newBatch]);
          setLoanPage(nextPage);
          setHasMoreLoans(allLoans.length > end);
        } else {
          setHasMoreLoans(false);
        }
      } catch (error) {
        console.error('Failed to fetch more loans', error);
      } finally {
        setIsFetchingMoreLoans(false);
      }
    }, 500);
  }, [member, loanPage, hasMoreLoans, isFetchingMoreLoans]);

  // Infinite Scroll Observers
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
      { threshold: 0.1 },
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
    if (!isMobile) return;

    const loanObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMoreLoans && hasMoreLoans) {
          loadMoreLoans();
        }
      },
      { threshold: 0.1 },
    );

    if (loanObserverTarget.current) {
      loanObserver.observe(loanObserverTarget.current);
    }

    return () => loanObserver.disconnect();
  }, [isMobile, isFetchingMoreLoans, hasMoreLoans, loadMoreLoans]);

  useEffect(() => {
    fetchMemberData();
  }, [fetchMemberData]);

  const handleInvestmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = investmentType === 'deposit' ? 'invest' : 'withdraw';
      await api.post(`/members/${id}/${endpoint}`, {
        amount: parseFloat(amount),
        description,
      });
      toast.success(
        `${investmentType === 'deposit' ? 'Investment added' : 'Withdrawal processed'} successfully`,
      );
      setAmount('');
      setDescription('');
      setShowInvestmentForm(false);
      fetchMemberData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleProfitRateUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/members/${id}`, {
        profitRate: parseFloat(newProfitRate) || 0,
      });
      toast.success('Profit rate updated successfully');
      setShowProfitRateForm(false);
      fetchMemberData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update profit rate',
      );
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!recipientIdentifier || !transferAmount) {
      toast.error('Recipient and amount are required');
      return;
    }

    setIsTransferring(true);
    try {
      await api.post('/members/admin/transfer', {
        senderId: id,
        recipientIdentifier: recipientIdentifier.trim(),
        amount: parseFloat(transferAmount),
        description: transferDescription,
      });

      toast.success('Transfer successful');
      setRecipientIdentifier('');
      setTransferAmount('');
      setTransferDescription('');
      setShowTransferForm(false);
      fetchMemberData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleMemberUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/members/${id}`, editForm);
      toast.success('Member details updated successfully');
      setShowMemberForm(false);
      fetchMemberData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member');
    }
  };

  const handleDownloadReport = async () => {
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
      doc.text('MEMBER FINANCIAL REPORT', pageWidth / 2, 20, {
        align: 'center',
      });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        27,
        { align: 'center' },
      );
      doc.line(20, 32, pageWidth - 20, 32);

      // Member Info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Member Information', 20, 42);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${capitalize(member.name)}`, 20, 50);
      doc.text(`Email: ${member.email}`, 20, 55);
      doc.text(`Phone: ${member.phone || 'N/A'}`, 20, 60);
      doc.text(`Status: ${member.status}`, 20, 65);
      doc.text(
        `Joined: ${new Date(member.createdAt).toLocaleDateString()}`,
        20,
        70,
      );

      // Financial Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Overview', 20, 85);

      autoTable(doc, {
        startY: 90,
        head: [['Metric', 'Value']],
        body: [
          ['Current Balance', formatPKR(member.currentBalance)],
          ['Total Invested', formatPKR(member.totalInvested)],
          ['Total Profits', formatPKR(member.totalProfit)],
          ['Active Loans', loans.length],
          [
            'Total Debt (Remaining)',
            formatPKR(loans.reduce((acc, l) => acc + l.remainingAmount, 0)),
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Investments Table
      // @ts-ignore
      let currentY = (doc.lastAutoTable?.finalY || 150) + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Investment & Withdrawal Registry', 20, currentY);

      if (investments.length > 0) {
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Date', 'Type', 'Amount', 'Balance After', 'Description']],
          body: investments.map((inv) => [
            new Date(inv.date).toLocaleDateString(),
            inv.type.toUpperCase(),
            formatPKR(inv.amount),
            formatPKR(inv.balanceAfter || 0),
            inv.description || '-',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', ' ');
        doc.text('No investment activity recorded.', 20, currentY + 5);
        // @ts-ignore
        doc.lastAutoTable = { finalY: currentY + 5 };
      }

      // Profits Table
      // @ts-ignore
      currentY = (doc.lastAutoTable?.finalY || currentY) + 15;
      // @ts-ignore
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Yield / Profit History', 20, currentY);

      if (profits.length > 0) {
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Date', 'Period', 'Amount']],
          body: profits.map((p) => [
            new Date(p.date).toLocaleDateString(),
            p.period,
            formatPKR(p.amount),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] }, // Amber
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', ' ');
        doc.text('No profit distributions recorded.', 20, currentY + 5);
        // @ts-ignore
        doc.lastAutoTable = { finalY: currentY + 5 };
      }

      // Associated Loans
      // @ts-ignore
      currentY = (doc.lastAutoTable?.finalY || currentY) + 15;
      // @ts-ignore
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Active Loans', 20, currentY);

      if (loans.length > 0) {
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Loan ID', 'Principal', 'Remaining', 'Status', 'Duration']],
          body: loans.map((l) => [
            l._id.slice(-6).toUpperCase(),
            formatPKR(l.principal),
            formatPKR(l.remainingAmount),
            l.status.toUpperCase(),
            `${l.duration} Months`,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] }, // Red
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', ' ');
        doc.text('No associated loans.', 20, currentY + 5);
        // @ts-ignore
        doc.lastAutoTable = { finalY: currentY + 5 };
      }

      // Repayments Table
      // @ts-ignore
      currentY = (doc.lastAutoTable?.finalY || currentY) + 15;
      // @ts-ignore
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Consolidated Repayment Log', 20, currentY);

      if (repayments.length > 0) {
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Date', 'Amount', 'Loan ID', 'Notes']],
          body: repayments.map((rp) => [
            new Date(rp.date).toLocaleDateString(),
            formatPKR(rp.amount),
            // @ts-ignore
            rp.loan?._id?.slice(-6).toUpperCase() || rp.loan || 'N/A',
            rp.notes || '-',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129] },
        });
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', ' ');
        doc.text('No repayments found.', 20, currentY + 5);
        // @ts-ignore
        doc.lastAutoTable = { finalY: currentY + 5 };
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
          'Official Member Report - Generated via Aurbitrage Loan Management SaaS',
          pageWidth / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' },
        );
      }

      doc.save(
        `MemberReport_${member.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      );
      toast.success('Member report downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <MemberProfileSkeleton />;
  if (!member) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        variant="card"
        icon={User}
        onBack={() => navigate('/members')}
        title={
          <>
            {capitalize(member.name.split(' ')[0])}{' '}
            <span className="text-primary ">
              {capitalize(member.name.split(' ').slice(1).join(' '))}
            </span>
          </>
        }
        badge={
          <span
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              member.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-muted/50 text-muted-foreground border border-border/50'
            }`}
          >
            {member.status}
          </span>
        }
        description={
          <div className="flex gap-4 text-muted-foreground flex-col sm:flex-row items-start sm:items-center">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Mail size={14} className="text-primary" />
              {member.email}
            </div>
            <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Clock size={14} className="text-primary" />
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Tooltip content="Edit Member Details">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMemberForm(true)}
              className="w-12 h-12 rounded-2xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all border border-primary/10"
            >
              <Pencil size={18} />
            </Button>
          </Tooltip>

          <Tooltip content="Adjust Performance Rates">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowProfitRateForm(true)}
              className="w-12 h-12 rounded-2xl bg-amber-500/5 text-amber-600 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/10"
            >
              <Zap size={18} />
            </Button>
          </Tooltip>

          <Tooltip content="P2P Transfer">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTransferForm(true)}
              className="w-12 h-12 rounded-2xl bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/10"
            >
              <Send size={18} />
            </Button>
          </Tooltip>

          <Button
            onClick={() => {
              setInvestmentType('deposit');
              setShowInvestmentForm(true);
            }}
            variant="outline"
            className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2 border-primary/20 hover:bg-primary/5 text-primary flex items-center justify-center"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Balance
          </Button>

          <Button
            variant="gradient"
            disabled={isExporting}
            onClick={handleDownloadReport}
            className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Report
          </Button>
        </div>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <StatsCard
          title="Current Balance"
          amount={formatPKR(member.currentBalance || 0)}
          icon={<Wallet size={18} />}
          color="bg-primary text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Total Yield Earned"
          amount={formatPKR(member.totalProfit || 0)}
          icon={<TrendingUp size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          isGlass
        />
        <StatsCard
          title="Principal Invested"
          amount={formatPKR(member.totalInvested || 0)}
          icon={<DollarSign size={18} />}
          color="bg-blue-500 text-blue-600 border-blue-500/20"
          isGlass
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Forms (Injected) */}
          {(showInvestmentForm ||
            showProfitRateForm ||
            showTransferForm ||
            showMemberForm) && (
            <div className="p-5 sm:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    {showMemberForm ? (
                      <Pencil size={20} />
                    ) : showProfitRateForm ? (
                      <Zap size={20} />
                    ) : showTransferForm ? (
                      <Send size={20} />
                    ) : (
                      <ArrowUpCircle size={20} />
                    )}
                  </div>
                  {showMemberForm
                    ? 'Edit Member Profile'
                    : showProfitRateForm
                      ? 'Performance Configuration'
                      : showTransferForm
                        ? 'P2P Fund Transfer'
                        : 'Fund Movement'}
                </h3>
                <button
                  onClick={() => {
                    setShowInvestmentForm(false);
                    setShowProfitRateForm(false);
                    setShowTransferForm(false);
                    setShowMemberForm(false);
                  }}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {showMemberForm ? (
                <form onSubmit={handleMemberUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all lowercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Account Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm({ ...editForm, status: e.target.value })
                        }
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Physical Address
                      </label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm({ ...editForm, address: e.target.value })
                        }
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      type="submit"
                      variant="gradient"
                      className="w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      Update Profile
                    </Button>
                  </div>
                </form>
              ) : showProfitRateForm ? (
                <form
                  onSubmit={handleProfitRateUpdate}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Monthly Performance Rate (%)
                    </label>
                    <input
                      type="number"
                      value={newProfitRate}
                      onChange={(e) => setNewProfitRate(e.target.value)}
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 2.5"
                      className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>
                  <div className="flex gap-3 h-[52px]">
                    <button
                      type="button"
                      onClick={() => setShowProfitRateForm(false)}
                      className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      variant="gradient"
                      className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Apply Rate
                    </Button>
                  </div>
                </form>
              ) : showTransferForm ? (
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Recipient (Email, Phone or Account)
                      </label>
                      <input
                        type="text"
                        value={recipientIdentifier}
                        onChange={(e) => setRecipientIdentifier(e.target.value)}
                        required
                        placeholder="Search member..."
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Transfer Amount (PKR)
                      </label>
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        required
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Transfer Description
                      </label>
                      <input
                        type="text"
                        value={transferDescription}
                        onChange={(e) => setTransferDescription(e.target.value)}
                        placeholder="e.g. Ad-hoc fund movement"
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      type="submit"
                      disabled={isTransferring}
                      variant="gradient"
                      className="w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      {isTransferring ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Send size={16} className="mr-2" />
                      )}
                      Initiate Transfer
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleInvestmentSubmit} className="space-y-6">
                  <div className="flex gap-4 p-1 bg-muted/30 rounded-2xl w-fit">
                    <button
                      type="button"
                      onClick={() => setInvestmentType('deposit')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        investmentType === 'deposit'
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvestmentType('withdrawal')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        investmentType === 'withdrawal'
                          ? 'bg-indigo-500 text-white shadow-lg'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Transaction Amount (PKR)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Purpose / Note
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Quarterly Rebalancing"
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="submit"
                      className={`w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 text-white ${
                        investmentType === 'deposit'
                          ? 'bg-emerald-600 shadow-xl shadow-emerald-500/20'
                          : 'bg-indigo-600 shadow-xl shadow-indigo-500/20'
                      }`}
                    >
                      Execute Funds Movement
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Transaction Timeline */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">
                  Transaction Registry
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  History of all fund injections and withdrawals.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-muted/30">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              {investments.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No Transactions"
                  description="Zero recorded transactions for this member yet."
                  className="py-12 border-none bg-transparent"
                />
              ) : (
                investments.map((inv) => (
                  <div
                    key={inv._id}
                    className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                          inv.type === 'deposit' ||
                          inv.type === 'transfer_receive'
                            ? 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white'
                            : 'bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white'
                        }`}
                      >
                        {inv.type === 'deposit' ||
                        inv.type === 'transfer_receive' ? (
                          <ArrowUpCircle size={22} />
                        ) : (
                          <ArrowDownCircle size={22} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black tracking-tight">
                          {inv.description || inv.type}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(inv.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-black ${
                          inv.type === 'deposit' ||
                          inv.type === 'transfer_receive'
                            ? 'text-emerald-600'
                            : 'text-indigo-600'
                        }`}
                      >
                        {inv.type === 'deposit' ||
                        inv.type === 'transfer_receive'
                          ? '+'
                          : '-'}{' '}
                        {formatPKR(inv.amount)}
                      </div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                        Balance: {formatPKR(inv.balanceAfter)}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Infinite Scroll Trigger for Investments (Mobile only) */}
              {isMobile && hasMoreInvestments && (
                <div ref={investmentObserverTarget}>
                  <InfiniteLoader isFetchingMore={isFetchingMoreInvestments} />
                </div>
              )}

              {/* Desktop Pagination */}
              {!isMobile && investments.length > 0 && (
                <div className="mt-6 border-t border-border/50 pt-6">
                  <Pagination
                    currentPage={investmentPage}
                    totalPages={investmentTotalPages}
                    totalEntries={investmentTotal}
                    limit={itemsPerPage}
                    onPageChange={handleInvestmentPageChange}
                    onLimitChange={() => {}} // Stability: keeping it locked to 5 for now as requested
                  />
                </div>
              )}
            </div>
          </div>
          {/* Associated Loans Section */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">
                  Associated Loans
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Active debt obligations for this member.
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-2xl">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div className="space-y-4">
              {loans.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                    Zero Active Loans
                  </p>
                </div>
              ) : (
                loans.map((loan) => (
                  <div
                    key={loan._id}
                    className="flex items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <DollarSign size={22} />
                      </div>
                      <div>
                        <div className="text-sm font-black tracking-tight">
                          {formatPKR(loan.principal)}
                        </div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {loan.duration} Months •{' '}
                          <span
                            className={`px-1.5 py-0.5 rounded-md ${
                              loan.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : loan.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : loan.status === 'completed'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-black text-red-500">
                          {formatPKR(loan.remainingAmount)}
                        </div>
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                          Remaining
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/loans/${loan._id}`)}
                        className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Infinite Scroll Trigger for Loans */}
              {isMobile && hasMoreLoans && (
                <div ref={loanObserverTarget}>
                  <InfiniteLoader isFetchingMore={isFetchingMoreLoans} />
                </div>
              )}
            </div>
          </div>

          {/* Document Vault Section */}
          {member.documents && member.documents.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tighter text-primary">
                    Document Vault
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">
                    Securely stored identity and professional documents.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-primary/10">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {member.documents.map((doc, idx) => (
                  <a
                    key={idx}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-3xl border border-border/30 bg-muted/5 hover:bg-primary/5 hover:border-primary/30 transition-all flex flex-col items-center gap-3 text-center"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors"
                      title={doc.name}
                    >
                      <FileBadge size={28} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-tight truncate max-w-[120px]">
                        {doc.name}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                        <Download size={8} />
                        Click to View
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Components */}
        <div className="lg:col-span-4 space-y-8">
          {/* Profit Registry Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden group">
            <TrendingUp className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  Yield History
                </h3>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar-white">
                {profits.length === 0 ? (
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 py-10">
                    No yield distributions found
                  </p>
                ) : (
                  profits.map((profit) => (
                    <div
                      key={profit._id}
                      className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-between hover:bg-white/20 transition-all"
                    >
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-widest mb-0.5">
                          {profit.period}
                        </div>
                        <div className="text-[9px] font-bold opacity-60">
                          {new Date(profit.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm font-black">
                        +{formatPKR(profit.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Professional & Identity Section */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              Professional & Identity
              <ShieldCheck size={12} />
            </h3>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  CNIC / National ID
                </span>
                <span className="text-sm font-black font-mono">
                  {member.cnic || 'Not Provided'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Wallet size={10} className="text-primary" />
                    Saving Account
                  </span>
                  <span className="text-sm font-black font-mono text-primary">
                    {member.savingAccountNumber || 'Not Assigned'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Wallet size={10} className="text-indigo-500" />
                    Current Account
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-500">
                    {member.currentAccountNumber || 'Not Assigned'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Occupation
                  </span>
                  <span className="text-xs font-bold truncate">
                    {member.job || 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Monthly Income
                  </span>
                  <span className="text-xs font-black text-emerald-600">
                    {member.monthlyIncome
                      ? formatPKR(member.monthlyIncome)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* {member.documents && member.documents.length > 0 && (
              <div className="pt-6 border-t border-border/50">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                  Verified Documents ({member.documents.length})
                </span>
                <div className="space-y-2">
                  {member.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-primary/5 hover:text-primary transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-card text-muted-foreground group-hover:text-primary transition-colors">
                        <FileCheck size={14} />
                      </div>
                      <span className="text-[10px] font-bold truncate flex-1">
                        {doc.name}
                      </span>
                      <Download
                        size={12}
                        className="opacity-0 group-hover:opacity-100"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )} */}
          </div>

          {/* Quick Insight Card */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              Account Highlights
              <Info size={12} />
            </h3>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Investment Share
                </span>
                <span className="text-xl font-black text-primary">
                  {(member.profitRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-600 transition-all duration-1000"
                  style={{ width: `${Math.min(member.profitRate || 0, 100)}%` }}
                />
              </div>

              <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    ROI Velocity
                  </div>
                  <div className="text-sm font-black text-emerald-500">
                    Accelerating
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Risk Rating
                  </div>
                  <div className="text-sm font-black text-blue-500">
                    Optimized
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;
