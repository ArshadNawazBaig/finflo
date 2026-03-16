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
  ArrowDownLeft,
  ArrowUpRight,
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
  CheckCircle2,
  RefreshCw,
  Building2,
  BadgeDollarSign,
  PieChart,
  ImagePlus,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import api from '@/lib/axios';
import { formatCurrency, capitalize, formatCNIC, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { exportMemberStatement } from '@/lib/pdfExportUtils';
import SignaturePad from '@/components/ui/SignaturePad';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/useIsMobile';

const MemberProfileSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex justify-between items-center bg-card/30 p-5 sm:p-8 rounded-[2.5rem] border border-border/50">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-32 rounded-full" />
    </div>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-8">
        <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
        <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
        <div className="h-[300px] rounded-[2.5rem] border border-border/10 bg-card/40 backdrop-blur-lg shadow-sm" />
      </div>
      <div className="lg:col-span-4 space-y-8">
        <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
        <div className="h-[220px] rounded-[2.5rem] border border-border/10 bg-card/40 backdrop-blur-lg shadow-sm" />
      </div>
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
  const [isInvestmentsLoading, setIsInvestmentsLoading] = useState(false);
  const [isLoansLoading, setIsLoansLoading] = useState(false);
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
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [searchTransferResults, setSearchTransferResults] = useState([]);
  const [isLookingUpTransfer, setIsLookingUpTransfer] = useState(false);
  const [transferRecipientName, setTransferRecipientName] = useState('');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    cnic: '',
    address: '',
    status: '',
    branchId: '',
    shareProfitRate: '',
    jobDetail: '',
    signature: '',
    nominee: {
      name: '',
      cnic: '',
      relation: '',
      cnicImage: '',
    },
  });
  const [branches, setBranches] = useState([]);
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [useShareCustomRates, setUseShareCustomRates] = useState(false);
  const isMobile = useIsMobile();

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

  // Business Share state
  const [shares, setShares] = useState([]);
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareFormType, setShareFormType] = useState('deposit'); // 'deposit' | 'withdrawal' | 'profit'
  const [shareAmount, setShareAmount] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [sharePeriod, setSharePeriod] = useState('');
  const [isSharesLoading, setIsSharesLoading] = useState(false);
  const [shareCurrentPage, setShareCurrentPage] = useState(1);
  const [shareTotalPages, setShareTotalPages] = useState(1);
  const [shareTotal, setShareTotal] = useState(0);
  const [isSubmittingShare, setIsSubmittingShare] = useState(false);
  const [isSubmittingInvestment, setIsSubmittingInvestment] = useState(false);
  const [isSubmittingProfitRate, setIsSubmittingProfitRate] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [shareProfitRate, setShareProfitRate] = useState('');
  const [isFetchingMoreShares, setIsFetchingMoreShares] = useState(false);
  const [shareLimit, setShareLimit] = useState(5);
  const [applyDeduction, setApplyDeduction] = useState(true);
  const [deductFromBalance, setDeductFromBalance] = useState(false);
  const [repaymentType, setRepaymentType] = useState('installment');
  const [lastActiveLoanPaymentDate, setLastActiveLoanPaymentDate] =
    useState(null);
  const [isFetchingActiveLoanPayment, setIsFetchingActiveLoanPayment] =
    useState(false);

  const getSettlementDetails = (loan) => {
    if (!loan)
      return { amount: 0, monthsElapsed: 0, interest: 0, isEarly: false };
    const start = new Date(loan.startDate);
    const now = new Date();

    // In-sync with backend precise date calculation
    let fullMonths =
      now.getFullYear() * 12 +
      now.getMonth() -
      (start.getFullYear() * 12 + start.getMonth());
    if (now.getDate() < start.getDate()) {
      fullMonths -= 1;
    }
    fullMonths = Math.max(0, fullMonths);

    const lastAnniversary = new Date(start);
    lastAnniversary.setMonth(lastAnniversary.getMonth() + fullMonths);
    const diffTime = Math.abs(now - lastAnniversary);
    const daysIntoMonth = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (fullMonths >= loan.duration) {
      return {
        amount: Math.round(loan.remainingAmount),
        monthsElapsed: loan.duration,
        interest: Math.round(loan.totalAmount - loan.principal),
        isEarly: false,
      };
    }

    let adjustedInterest = 0;
    let adjustedPrincipal = loan.principal;

    if (loan.interestType === 'simple' || !loan.interestType) {
      const monthlyInterest = (loan.principal * loan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      const calculatedInterest =
        monthlyInterest * fullMonths + dailyInterest * daysIntoMonth;
      adjustedInterest = Math.round(
        Math.max(monthlyInterest, calculatedInterest),
      );
    } else if (loan.interestType === 'emi') {
      const monthlyRate = loan.rate / 12 / 100;
      const r = monthlyRate;
      const P = loan.principal;
      const E = loan.emi;
      const m = fullMonths;

      // Principal balance after m months
      adjustedPrincipal =
        P * Math.pow(1 + r, m) - (E * (Math.pow(1 + r, m) - 1)) / r;
      adjustedPrincipal = Math.max(0, Math.round(adjustedPrincipal));

      const dailyInterest = (adjustedPrincipal * monthlyRate) / 30;
      adjustedInterest = Math.round(dailyInterest * daysIntoMonth);
    }

    const adjustedTotal = adjustedPrincipal + adjustedInterest;
    return {
      amount: Math.round(Math.max(0, adjustedTotal - loan.paidAmount)),
      adjustedPrincipal: Math.round(adjustedPrincipal),
      adjustedInterest: Math.round(adjustedInterest),
      monthsElapsed: fullMonths,
      daysIntoMonth,
      isEarly: true,
    };
  };

  const activeLoan = loans.find((l) => l.status === 'active');
  const settlementDetails = activeLoan
    ? getSettlementDetails(activeLoan)
    : null;

  // Fetch last repayment date for active loan to show days-based installment
  useEffect(() => {
    if (!activeLoan?._id) return;
    setIsFetchingActiveLoanPayment(true);
    api
      .get(
        `/repayments?loanId=${activeLoan._id}&limit=1&sortBy=date&sortOrder=desc`,
      )
      .then(({ data }) => {
        const reps = data?.data || [];
        if (reps.length > 0) {
          setLastActiveLoanPaymentDate(new Date(reps[0].date));
        } else {
          setLastActiveLoanPaymentDate(new Date(activeLoan.startDate));
        }
      })
      .catch(() => setLastActiveLoanPaymentDate(new Date(activeLoan.startDate)))
      .finally(() => setIsFetchingActiveLoanPayment(false));
  }, [activeLoan?._id]);

  // Daily-adjusted installment details based on days since last payment
  const getAutoDeductionDailyDetails = () => {
    if (!activeLoan)
      return { daysPassed: 0, interestForDays: 0, adjustedAmount: 0 };
    const refDate = lastActiveLoanPaymentDate || new Date(activeLoan.startDate);
    const now = new Date();
    let diff = now.getTime() - refDate.getTime();
    if (diff < 0) diff = 0;
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
    const monthlyInterest = (activeLoan.principal * activeLoan.rate) / 1200;
    const dailyInterest = monthlyInterest / 30;
    const interestForDays = Math.round(dailyInterest * daysPassed);
    const principalPerInstallment = Math.round(
      activeLoan.principal / (activeLoan.duration || 1),
    );
    const adjustedAmount = principalPerInstallment + interestForDays;
    return { daysPassed, interestForDays, adjustedAmount };
  };
  const autoDeductionDaily = getAutoDeductionDailyDetails();

  const investmentObserverTarget = useRef(null);
  const loanObserverTarget = useRef(null);
  const shareObserverTarget = useRef(null);

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
        cnic: memberRes.data.cnic || '',
        address: memberRes.data.address || '',
        status: memberRes.data.status || '',
        branchId: memberRes.data.branchId?._id || memberRes.data.branchId || '',
        shareProfitRate: memberRes.data.shareProfitRate || 0,
        jobDetail: memberRes.data.jobDetail || '',
        signature: memberRes.data.signature || '',
        nominee: {
          name: memberRes.data.customer?.nominee?.name || '',
          cnic: memberRes.data.customer?.nominee?.cnic || '',
          relation: memberRes.data.customer?.nominee?.relation || '',
          cnicImage: memberRes.data.customer?.nominee?.cnicImage || '',
        },
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
      setIsInvestmentsLoading(true);
      const { data } = await api.get(
        `/members/${id}/investments?page=${newPage}&limit=${itemsPerPage}`,
      );
      setInvestments(data.investments || []);
      setInvestmentPage(newPage);
      setHasMoreInvestments(data.currentPage < data.totalPages);
    } catch (error) {
      toast.error('Failed to load page');
    } finally {
      setIsInvestmentsLoading(false);
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

  // ── Business Share handlers ─────────────────────────────────────────────────
  const fetchMemberShares = useCallback(
    async (page = 1, isAppend = false) => {
      if (isAppend) {
        setIsFetchingMoreShares(true);
      } else {
        setIsSharesLoading(true);
      }
      try {
        const { data } = await api.get(
          `/members/${id}/shares?page=${page}&limit=${shareLimit}`,
        );
        const newData = data.shares || [];
        if (isAppend) {
          setShares((prev) => [...prev, ...newData]);
        } else {
          setShares(newData);
        }
        setShareCurrentPage(data.currentPage || 1);
        setShareTotalPages(data.totalPages || 1);
        setShareTotal(data.total || 0);
      } catch (error) {
        toast.error('Failed to load share history');
      } finally {
        setIsSharesLoading(false);
        setIsFetchingMoreShares(false);
      }
    },
    [id],
  );

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
    if (!isMobile) return;

    const shareObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreShares &&
          shareCurrentPage < shareTotalPages
        ) {
          fetchMemberShares(shareCurrentPage + 1, true);
        }
      },
      { threshold: 0.1 },
    );

    if (shareObserverTarget.current) {
      shareObserver.observe(shareObserverTarget.current);
    }

    return () => shareObserver.disconnect();
  }, [
    isMobile,
    isFetchingMoreShares,
    shareCurrentPage,
    shareTotalPages,
    fetchMemberShares,
  ]);

  const fetchBranches = useCallback(async () => {
    try {
      setIsBranchesLoading(true);
      const { data } = await api.get('/branches');
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    } finally {
      setIsBranchesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemberData();
    fetchBranches();
  }, [fetchMemberData, fetchBranches]);

  // Auto-lookup recipient for transfer
  useEffect(() => {
    const lookup = async () => {
      if (
        recipientIdentifier &&
        recipientIdentifier.trim().length >= 3 &&
        !transferRecipientName
      ) {
        setIsLookingUpTransfer(true);
        try {
          const { data } = await api.get(
            `/members/lookup?identifier=${recipientIdentifier.trim()}`,
          );

          // Exclude self from search results
          const filteredResults = data.filter((m) => m._id !== id);
          setSearchTransferResults(filteredResults);

          // Find exact match
          const exactMatch = filteredResults.find(
            (m) =>
              m.email?.toLowerCase() ===
                recipientIdentifier.trim().toLowerCase() ||
              m.phone?.replace(/\D/g, '') ===
                recipientIdentifier.trim().replace(/\D/g, '') ||
              m.cnic?.replace(/\D/g, '') ===
                recipientIdentifier.trim().replace(/\D/g, ''),
          );

          if (exactMatch) {
            setTransferRecipientName(exactMatch.name);
          } else {
            setTransferRecipientName('');
          }
        } catch (error) {
          console.error('Lookup failed', error);
          setSearchTransferResults([]);
          setTransferRecipientName('');
        } finally {
          setIsLookingUpTransfer(false);
        }
      } else if (!recipientIdentifier) {
        setSearchTransferResults([]);
        setTransferRecipientName('');
      }
    };

    const timeoutId = setTimeout(lookup, 400);
    return () => clearTimeout(timeoutId);
  }, [recipientIdentifier, id, transferRecipientName]);

  const handleInvestmentSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingInvestment(true);
      const endpoint = investmentType === 'deposit' ? 'invest' : 'withdraw';
      await api.post(`/members/${id}/${endpoint}`, {
        amount: parseFloat(amount),
        description,
        applyDeduction: investmentType === 'deposit' ? applyDeduction : false,
        repaymentType: investmentType === 'deposit' ? repaymentType : undefined,
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
    } finally {
      setIsSubmittingInvestment(false);
    }
  };

  const handleProfitRateUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingProfitRate(true);
      await api.put(`/members/${id}/profit-rate`, {
        profitRate: parseFloat(newProfitRate),
      });
      toast.success('Profit rate updated');
      setShowProfitRateForm(false);
      setNewProfitRate('');
      fetchMemberData();
    } catch (error) {
      toast.error('Failed to update profit rate');
    } finally {
      setIsSubmittingProfitRate(false);
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

  // ── Business Share handlers ─────────────────────────────────────────────────

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingShare(true);
    try {
      if (shareFormType === 'profit') {
        await api.post('/members/distribute-share-profit', {
          totalProfit: parseFloat(shareAmount) || 0,
          period: sharePeriod,
          description: shareDescription,
          useCustomRates: useShareCustomRates,
        });
        toast.success(
          `Share profit distributed to all share holders (${useShareCustomRates ? 'Custom Rates' : 'Proportional'})`,
        );
      } else {
        const endpoint =
          shareFormType === 'deposit' ? 'share-invest' : 'share-withdraw';
        await api.post(`/members/${id}/${endpoint}`, {
          amount: parseFloat(shareAmount),
          description: shareDescription,
          deductFromBalance:
            shareFormType === 'deposit' ? deductFromBalance : false,
        });
        toast.success(
          shareFormType === 'deposit'
            ? 'Share investment added'
            : 'Share withdrawal processed',
        );
      }
      setShareAmount('');
      setShareDescription('');
      setSharePeriod('');
      setShowShareForm(false);
      fetchMemberData();
      fetchMemberShares(1, false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmittingShare(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Fetch share history after fetchMemberShares is defined
  useEffect(() => {
    if (id) fetchMemberShares(1, false);
  }, [id, fetchMemberShares, shareLimit]);

  const handleRecalcBalance = async () => {
    try {
      setRecalcLoading(true);
      const res = await api.post('/members/recalculate-balance', {
        memberId: id,
      });
      const result = res.data.results?.[0];
      if (result) {
        toast.success(
          `Balance synced: ${formatCurrency(result.oldBalance)} → ${formatCurrency(result.newBalance)}`,
        );
      } else {
        toast.success('Balance recalculated successfully');
      }
      fetchMemberData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to recalculate balance',
      );
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleMemberUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingMember(true);
      await api.put(`/members/${id}`, editForm);
      toast.success('Member profile updated');
      setShowMemberForm(false);
      fetchMemberData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update member');
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setIsExporting(true);
      await exportMemberStatement(member, investments, profits);
      toast.success('Member statement downloaded successfully');
    } catch (error) {
      console.error('Statement Generation Error:', error);
      toast.error('Failed to generate statement');
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
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Mail size={14} className="text-primary" />
              {member.email || 'No email provided'}
            </div>
            <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <ShieldCheck size={14} className="text-primary" />
              {member.cnic}
            </div>
            <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-medium">
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

          <Tooltip content="Sync Balance from Ledger">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRecalcBalance}
              isLoading={recalcLoading}
              className="w-12 h-12 rounded-2xl bg-rose-500/5 text-rose-600 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
            >
              <RefreshCw size={18} />
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
            isLoading={isExporting}
            onClick={handleDownloadReport}
            className="h-12 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2"
          >
            <Download size={16} />
            Report
          </Button>
        </div>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Current Balance"
          amount={formatCurrency(member.currentBalance || 0)}
          icon={<Wallet size={18} />}
          color="bg-primary text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Loan Eligibility"
          amount={formatCurrency(member.creditLimit || 0)}
          icon={<ShieldCheck size={18} />}
          color="bg-amber-500 text-amber-600 border-amber-500/20"
          isGlass
        />
        <StatsCard
          title="Total Yield Earned"
          amount={formatCurrency(member.totalProfit || 0)}
          icon={<TrendingUp size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          isGlass
        />
        <StatsCard
          title="Principal Invested"
          amount={formatCurrency(member.totalInvested || 0)}
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
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all lowercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        CNIC Number (Required)
                      </label>
                      <input
                        type="text"
                        value={editForm.cnic}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            cnic: formatCNIC(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        required
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
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Share Profit Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.shareProfitRate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            shareProfitRate: e.target.value,
                          })
                        }
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                        Assigned Branch
                        {isBranchesLoading && (
                          <Loader2 size={10} className="animate-spin" />
                        )}
                      </label>
                      <select
                        value={editForm.branchId}
                        onChange={(e) =>
                          setEditForm({ ...editForm, branchId: e.target.value })
                        }
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {branches.map((branch) => (
                          <option key={branch._id} value={branch._id}>
                            {branch.name}
                          </option>
                        ))}
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
                      />
                    </div>

                    {/* Nominee Details Section */}
                    <div className="col-span-2 space-y-6 pt-4 border-t border-border/10">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                          Nominee Information
                        </h4>
                        <div className="h-px flex-1 bg-primary/10 ml-4" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                            Nominee Name
                          </label>
                          <input
                            type="text"
                            value={editForm.nominee.name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                nominee: {
                                  ...editForm.nominee,
                                  name: e.target.value,
                                },
                              })
                            }
                            className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Full Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                            Nominee CNIC
                          </label>
                          <input
                            type="text"
                            value={editForm.nominee.cnic}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                nominee: {
                                  ...editForm.nominee,
                                  cnic: formatCNIC(e.target.value),
                                },
                              })
                            }
                            className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                            placeholder="XXXXX-XXXXXXX-X"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                            Relation
                          </label>
                          <input
                            type="text"
                            value={editForm.nominee.relation}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                nominee: {
                                  ...editForm.nominee,
                                  relation: e.target.value,
                                },
                              })
                            }
                            className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="e.g. Brother, Wife"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 block">
                            Nominee CNIC Image
                          </label>

                          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                            {editForm.nominee.cnicImage && (
                              <div className="relative group/nom-img">
                                <div className="h-32 w-48 rounded-2xl border border-border/50 bg-white shadow-sm overflow-hidden">
                                  <img
                                    src={editForm.nominee.cnicImage}
                                    alt="Nominee CNIC"
                                    className="w-full h-full object-contain p-2"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditForm({
                                      ...editForm,
                                      nominee: {
                                        ...editForm.nominee,
                                        cnicImage: '',
                                      },
                                    })
                                  }
                                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/nom-img:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}

                            <div className="flex-1 w-full">
                              <input
                                type="file"
                                accept="image/*"
                                id="nominee-cnic-edit"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setEditForm({
                                        ...editForm,
                                        nominee: {
                                          ...editForm.nominee,
                                          cnicImage: reader.result,
                                        },
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <label
                                htmlFor="nominee-cnic-edit"
                                className="flex flex-col items-center justify-center h-32 w-full border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/5 hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group"
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-muted-foreground group-hover:text-primary transition-colors">
                                    <ImagePlus size={24} strokeWidth={1.5} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                                    {editForm.nominee.cnicImage
                                      ? 'Change Image'
                                      : 'Upload Nominee CNIC'}
                                  </span>
                                </div>
                              </label>
                              <p className="text-[9px] text-muted-foreground mt-3 px-2 leading-relaxed">
                                Upload a clear photo of the nominee's CNIC
                                (Front or Back). Supported: JPG, PNG, WEBP.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 col-span-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                          Job Detail
                        </label>
                        <Textarea
                          placeholder="Provide more details about your professional role..."
                          value={editForm.jobDetail}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              jobDetail: e.target.value,
                            })
                          }
                          className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                        />
                      </div>
                      <div className="space-y-4 pt-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                          Member Signature{' '}
                          <span className="text-destructive">*</span>
                        </Label>
                        {editForm.signature && (
                          <div className="mb-2 p-2 border border-border/30 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                            <img
                              src={editForm.signature}
                              alt="Current Signature"
                              className="h-16 mx-auto object-contain rounded-lg"
                            />
                          </div>
                        )}
                        <SignaturePad
                          onSave={(dataUrl) =>
                            setEditForm((prev) => ({
                              ...prev,
                              signature: dataUrl,
                            }))
                          }
                          onClear={() =>
                            setEditForm((prev) => ({ ...prev, signature: '' }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button
                      type="submit"
                      isLoading={isUpdatingMember}
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
                      isLoading={isSubmittingProfitRate}
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
                    <div className="space-y-2 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Recipient (Email, Phone or Account)
                      </label>
                      <input
                        type="text"
                        value={recipientIdentifier}
                        autoComplete="off"
                        onChange={(e) => {
                          setRecipientIdentifier(e.target.value);
                          setTransferRecipientName('');
                        }}
                        required
                        placeholder="Search member..."
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:font-medium"
                      />

                      {/* Autocomplete Dropdown */}
                      {searchTransferResults.length > 0 &&
                        !transferRecipientName && (
                          <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-card border border-border/50 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchTransferResults.map((m) => (
                              <button
                                key={m._id}
                                type="button"
                                onClick={() => {
                                  setRecipientIdentifier(
                                    m.email || m.phone || m.cnic,
                                  );
                                  setTransferRecipientName(m.name);
                                  setSearchTransferResults([]);
                                }}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted text-left transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <User size={14} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-tight">
                                      {m.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                      {m.email || m.phone || m.cnic}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                      {/* No Results found */}
                      {!isLookingUpTransfer &&
                        recipientIdentifier &&
                        recipientIdentifier.length >= 3 &&
                        searchTransferResults.length === 0 &&
                        !transferRecipientName && (
                          <div className="absolute z-[100] left-0 right-0 top-full mt-2 p-4 rounded-2xl bg-card border border-border/50 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col items-center justify-center gap-2 py-2">
                              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                                <X size={16} />
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                No Member Found
                              </p>
                            </div>
                          </div>
                        )}

                      {isLookingUpTransfer && !transferRecipientName && (
                        <p className="text-[9px] text-muted-foreground ml-1 mt-1 flex items-center gap-1.5 animate-pulse">
                          <Loader2 size={10} className="animate-spin" />{' '}
                          Searching...
                        </p>
                      )}

                      {transferRecipientName && (
                        <div className="mx-1 mt-1 flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 animate-in fade-in zoom-in-95">
                          <CheckCircle2 size={10} className="shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            Verified: {transferRecipientName}
                          </span>
                        </div>
                      )}
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
                      isLoading={isTransferring}
                      variant="gradient"
                      className="w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      {!isTransferring && <Send size={16} className="mr-2" />}
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

                  {investmentType === 'deposit' &&
                    loans.some((l) => l.status === 'active') && (
                      <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                              <BadgeDollarSign size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-black tracking-tight">
                                Loan Auto-Deduction
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                Automatically use part of this deposit to repay
                                active loan.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setApplyDeduction(!applyDeduction)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${applyDeduction ? 'bg-indigo-600' : 'bg-muted'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${applyDeduction ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>

                        {applyDeduction && activeLoan && (
                          <div className="space-y-4 pt-2">
                            {/* Loan Quick Info */}
                            <div className="grid grid-cols-2 gap-4 px-2">
                              <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">
                                  Current Remaining
                                </p>
                                <p className="text-xs font-black text-indigo-700">
                                  {formatCurrency(activeLoan.remainingAmount)}
                                </p>
                              </div>
                              <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">
                                  Loan Type
                                </p>
                                <p className="text-[10px] font-black uppercase text-indigo-700">
                                  {activeLoan.interestType || 'Simple'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setRepaymentType('installment')}
                                className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${repaymentType === 'installment' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700' : 'border-border/50 hover:bg-muted'}`}
                              >
                                <div className="relative z-10">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest">
                                      EMI
                                    </p>
                                    {!isFetchingActiveLoanPayment && (
                                      <span className="text-[8px] font-black uppercase bg-indigo-500/20 text-indigo-600 px-1 py-0.5 rounded-full">
                                        {autoDeductionDaily.daysPassed}d
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-black mt-0.5">
                                    {isFetchingActiveLoanPayment
                                      ? '...'
                                      : formatCurrency(
                                          autoDeductionDaily.adjustedAmount,
                                        )}
                                  </p>
                                  {!isFetchingActiveLoanPayment && (
                                    <p className="text-[8px] font-medium text-indigo-600/70 mt-0.5">
                                      incl.{' '}
                                      {formatCurrency(
                                        autoDeductionDaily.interestForDays,
                                      )}{' '}
                                      interest
                                    </p>
                                  )}
                                </div>
                                <div className="absolute right-2 bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Clock size={24} />
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setRepaymentType('settlement')}
                                className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${repaymentType === 'settlement' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700' : 'border-border/50 hover:bg-muted'}`}
                              >
                                <div className="relative z-10">
                                  <p className="text-[10px] font-black uppercase tracking-widest">
                                    SETTLE
                                  </p>
                                  <p className="text-[11px] font-black mt-0.5">
                                    {settlementDetails
                                      ? formatCurrency(settlementDetails.amount)
                                      : 'Calculating...'}
                                  </p>
                                </div>
                                <div className="absolute right-2 bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <ShieldCheck size={24} />
                                </div>
                              </button>
                            </div>

                            {/* Impact Analysis */}
                            {amount && (
                              <div className="mx-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                                    Auto-Deduction Amount
                                  </span>
                                  <span className="text-xs font-black text-indigo-700">
                                    {repaymentType === 'installment'
                                      ? formatCurrency(
                                          Math.min(
                                            parseFloat(amount) || 0,
                                            activeLoan.emi,
                                          ),
                                        )
                                      : formatCurrency(
                                          Math.min(
                                            parseFloat(amount) || 0,
                                            settlementDetails?.amount || 0,
                                          ),
                                        )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-indigo-500/10">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600/60">
                                    Member Wallet Credit
                                  </span>
                                  <span className="text-xs font-black text-indigo-700/60">
                                    {formatCurrency(
                                      Math.max(
                                        0,
                                        (parseFloat(amount) || 0) -
                                          (repaymentType === 'installment'
                                            ? Math.min(
                                                parseFloat(amount) || 0,
                                                activeLoan.emi,
                                              )
                                            : Math.min(
                                                parseFloat(amount) || 0,
                                                settlementDetails?.amount || 0,
                                              )),
                                      ),
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="submit"
                      isLoading={isSubmittingInvestment}
                      className={`w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 text-white ${
                        investmentType === 'deposit'
                          ? 'bg-emerald-600 shadow-xl shadow-emerald-500/20 hover:bg-emerald-700'
                          : 'bg-indigo-600 shadow-xl shadow-indigo-500/20 hover:bg-indigo-700'
                      }`}
                    >
                      Execute Funds Movement
                    </Button>
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
              {isInvestmentsLoading ? (
                <div className="py-20 flex justify-center items-center">
                  <InfiniteLoader isFetchingMore={true} />
                </div>
              ) : investments.length === 0 ? (
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
                        <div className="text-sm font-black tracking-tight capitalize">
                          {inv.description || inv.type}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(inv.date).toLocaleDateString()}
                          </div>
                          {inv.status && (
                            <div
                              className={cn(
                                'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border leading-none',
                                inv.status === 'Completed' &&
                                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                                inv.status === 'Pending' &&
                                  'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                inv.status === 'Failed' &&
                                  'bg-rose-500/10 text-rose-600 border-rose-500/20',
                              )}
                            >
                              <span
                                className={cn(
                                  'w-1 h-1 rounded-full',
                                  inv.status === 'Completed' &&
                                    'bg-emerald-500',
                                  inv.status === 'Pending' &&
                                    'bg-amber-500 animate-pulse',
                                  inv.status === 'Failed' && 'bg-rose-500',
                                )}
                              />
                              {inv.status}
                            </div>
                          )}

                          {/* Sender/Recipient Details */}
                          {(inv.type === 'transfer_receive' ||
                            inv.type === 'transfer_send') && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mx-1" />
                              <div className="text-[10px] font-bold text-muted-foreground tracking-tight flex items-center gap-1">
                                {inv.type === 'transfer_receive' ? (
                                  <>
                                    <ArrowDownLeft
                                      size={10}
                                      className="text-emerald-500"
                                    />
                                    From:{' '}
                                    <span className="text-foreground capitalize">
                                      {inv.metadata?.senderName ||
                                        inv.description?.replace(
                                          /transfer from /i,
                                          '',
                                        )}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpRight
                                      size={10}
                                      className="text-rose-500"
                                    />
                                    To:{' '}
                                    <span className="text-foreground">
                                      {inv.metadata?.recipientName ||
                                        inv.description?.replace(
                                          /transfer to /i,
                                          '',
                                        )}
                                    </span>
                                  </>
                                )}
                              </div>
                            </>
                          )}
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
                        {formatCurrency(inv.amount)}
                      </div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                        Balance: {formatCurrency(inv.balanceAfter)}
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
                          {formatCurrency(loan.principal)}
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
                          {formatCurrency(loan.remainingAmount)}
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

          {/* Nominee Details Card */}
          {(member.customer?.nominee?.name ||
            member.customer?.nominee?.cnic ||
            member.customer?.nominee?.relation) && (
            <div className="bg-white dark:bg-slate-900 border border-amber-500/30 p-8 sm:p-10 rounded-[2.5rem] shadow-sm space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tighter">
                  Nominee Details
                </h3>
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Full Name
                  </span>
                  <span className="text-sm font-black capitalize">
                    {member.customer?.nominee?.name || 'Not provided'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    CNIC
                  </span>
                  <span className="text-sm font-black font-mono">
                    {member.customer?.nominee?.cnic || 'Not provided'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Relation
                  </span>
                  <span className="text-sm font-black capitalize">
                    {member.customer?.nominee?.relation || 'Not provided'}
                  </span>
                </div>

                {member.customer?.nominee?.cnicImage && (
                  <div className="md:col-span-3 pt-4 border-t border-border/10 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      CNIC Image
                    </span>
                    <a
                      href={member.customer.nominee.cnicImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative h-48 w-full md:w-1/2 rounded-2xl border border-border/50 bg-white dark:bg-slate-800 overflow-hidden group/nom-cnic shadow-sm hover:border-amber-500/50 transition-colors"
                    >
                      <img
                        src={member.customer.nominee.cnicImage}
                        alt="Nominee CNIC"
                        className="w-full h-full object-contain p-3 group-hover/nom-cnic:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/nom-cnic:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-black uppercase tracking-widest">
                          Click to Enlarge
                        </span>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Business Share Section ─────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-violet-500/20 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <Building2 size={20} className="text-violet-500" />
                  Business Share
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  Member's share of the business — separate from main balance,
                  not auto-deducted in loans.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setShareFormType('deposit');
                    setShowShareForm(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-500/10 text-violet-600 hover:bg-violet-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  <ArrowUpCircle size={14} /> Add Share
                </button>
                <button
                  onClick={() => {
                    setShareFormType('withdrawal');
                    setShowShareForm(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  <ArrowDownCircle size={14} /> Withdraw
                </button>
                {/* <button
                  onClick={() => {
                    setShareFormType('profit');
                    setShowShareForm(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                >
                  <BadgeDollarSign size={14} /> Distribute Profit
                </button> */}
              </div>
            </div>

            {/* Share Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Share Balance
                </p>
                <p className="text-2xl font-black tracking-tight mt-1 text-violet-600">
                  {formatCurrency(member.shareBalance || 0)}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Total Share Invested
                </p>
                <p className="text-2xl font-black tracking-tight mt-1">
                  {formatCurrency(member.totalShareInvested || 0)}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Share Profit Earned
                </p>
                <p className="text-2xl font-black tracking-tight mt-1 text-amber-600">
                  {formatCurrency(member.totalShareProfit || 0)}
                </p>
              </div>
            </div>

            {/* Share Form Modal */}
            {showShareForm && (
              <div className="p-6 rounded-2xl border-2 border-violet-500/20 bg-violet-500/5 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                    {shareFormType === 'deposit' ? (
                      <ArrowUpCircle size={16} className="text-violet-500" />
                    ) : shareFormType === 'withdrawal' ? (
                      <ArrowDownCircle size={16} className="text-rose-500" />
                    ) : (
                      <BadgeDollarSign size={16} className="text-amber-500" />
                    )}
                    {shareFormType === 'deposit'
                      ? 'Add Share Investment'
                      : shareFormType === 'withdrawal'
                        ? 'Withdraw from Share'
                        : 'Distribute Share Profit (All Members)'}
                  </h4>
                  <button
                    onClick={() => setShowShareForm(false)}
                    className="p-1.5 hover:bg-muted rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
                <form onSubmit={handleShareSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {shareFormType === 'profit'
                          ? useShareCustomRates
                            ? 'Total Profit Reference'
                            : 'Total Profit Pool'
                          : 'Amount'}
                      </label>
                      <input
                        type="number"
                        required={
                          !useShareCustomRates || shareFormType !== 'profit'
                        }
                        min="1"
                        value={shareAmount}
                        onChange={(e) => setShareAmount(e.target.value)}
                        placeholder={
                          useShareCustomRates && shareFormType === 'profit'
                            ? 'Optional reference amount'
                            : 'Enter amount'
                        }
                        className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    {shareFormType === 'profit' && (
                      <div className="md:col-span-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                            Distribution Method
                          </label>
                          <div className="flex bg-muted p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setUseShareCustomRates(false)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${!useShareCustomRates ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                            >
                              Proportional
                            </button>
                            <button
                              type="button"
                              onClick={() => setUseShareCustomRates(true)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${useShareCustomRates ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}
                            >
                              Custom Rates
                            </button>
                          </div>
                        </div>
                        {useShareCustomRates ? (
                          <p className="text-[10px] font-medium text-amber-600 italic">
                            Profit will be calculated for each member using
                            their individual Share Profit Rate setting.
                          </p>
                        ) : (
                          <p className="text-[10px] font-medium text-amber-600 italic">
                            Profit pool will be split among all members based on
                            their share balance size.
                          </p>
                        )}
                      </div>
                    )}
                    {shareFormType === 'profit' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Period (e.g. Feb 2026)
                        </label>
                        <input
                          type="text"
                          value={sharePeriod}
                          onChange={(e) => setSharePeriod(e.target.value)}
                          placeholder="Feb 2026"
                          className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                        />
                      </div>
                    )}

                    {shareFormType === 'deposit' && (
                      <div className="md:col-span-2 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                              Funding Source
                            </label>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              Deduct from current main balance?
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDeductFromBalance(!deductFromBalance)
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${deductFromBalance ? 'bg-violet-600' : 'bg-muted'}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${deductFromBalance ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                          </button>
                        </div>
                        {deductFromBalance && (
                          <div className="pt-2 border-t border-violet-500/10 flex justify-between items-center text-[10px]">
                            <span className="font-bold text-muted-foreground uppercase">
                              Available Balance:
                            </span>
                            <span
                              className={`font-black tracking-widest ${member.currentBalance < (parseFloat(shareAmount) || 0) ? 'text-rose-500' : 'text-violet-600'}`}
                            >
                              {formatCurrency(member.currentBalance)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Note / Description
                      </label>
                      <input
                        type="text"
                        value={shareDescription}
                        onChange={(e) => setShareDescription(e.target.value)}
                        placeholder="Optional note"
                        className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowShareForm(false)}
                      className="px-6 py-2.5 rounded-xl border border-border/50 text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      isLoading={isSubmittingShare}
                      className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 ${
                        shareFormType === 'deposit'
                          ? 'bg-violet-600 hover:bg-violet-700'
                          : shareFormType === 'withdrawal'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      Confirm
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Share History */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Share Transaction History
              </p>
              {isSharesLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="animate-spin text-violet-500" />
                </div>
              ) : shares.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-violet-500/20 rounded-2xl bg-violet-500/5">
                  <Building2
                    size={28}
                    className="mx-auto text-violet-300 mb-2"
                  />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    No share transactions yet
                  </p>
                </div>
              ) : (
                <>
                  {shares.map((s) => {
                    const isCredit =
                      s.type === 'share_deposit' || s.type === 'share_profit';
                    const color =
                      s.type === 'share_profit'
                        ? 'text-amber-600'
                        : isCredit
                          ? 'text-violet-600'
                          : 'text-rose-600';
                    const label =
                      s.type === 'share_deposit'
                        ? 'Share Deposit'
                        : s.type === 'share_withdrawal'
                          ? 'Withdrawal'
                          : 'Share Profit';
                    return (
                      <div
                        key={s._id}
                        className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCredit ? 'bg-violet-500/10' : 'bg-rose-500/10'} ${color}`}
                          >
                            {isCredit ? (
                              <ArrowUpCircle size={18} />
                            ) : (
                              <ArrowDownCircle size={18} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black">
                              {s.description || label}
                            </p>
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-[10px] font-black uppercase tracking-widest ${color}`}
                              >
                                {label}
                                {s.period ? ` · ${s.period}` : ''}
                              </p>
                              {s.status && (
                                <div
                                  className={cn(
                                    'text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 border leading-none',
                                    s.status === 'Completed' &&
                                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                                    s.status === 'Pending' &&
                                      'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                    s.status === 'Failed' &&
                                      'bg-rose-500/10 text-rose-600 border-rose-500/20',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'w-0.5 h-0.5 rounded-full',
                                      s.status === 'Completed' &&
                                        'bg-emerald-500',
                                      s.status === 'Pending' &&
                                        'bg-amber-500 animate-pulse',
                                      s.status === 'Failed' && 'bg-rose-500',
                                    )}
                                  />
                                  {s.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black ${color}`}>
                            {isCredit ? '+' : '-'}
                            {formatCurrency(s.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {isMobile && shareCurrentPage < shareTotalPages && (
                    <div ref={shareObserverTarget} className="py-4 px-4">
                      <InfiniteLoader isFetchingMore={isFetchingMoreShares} />
                    </div>
                  )}

                  {!isMobile && shares.length > 0 && (
                    <div className="mt-6 border-t border-border/50 pt-6">
                      <Pagination
                        currentPage={shareCurrentPage}
                        totalPages={shareTotalPages}
                        totalEntries={shareTotal}
                        limit={shareLimit}
                        onPageChange={(p) => fetchMemberShares(p, false)}
                        onLimitChange={(newLimit) => {
                          setShareLimit(newLimit);
                          setShareCurrentPage(1);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {/* ────────────────────────────────────────────────────────── */}

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
                        +{formatCurrency(profit.amount)}
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

              {member.branchId && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Building2 size={10} className="text-primary" />
                    Assigned Branch
                  </span>
                  <span className="text-sm font-black capitalize">
                    {member.branchId?.name ||
                      (typeof member.branchId === 'string'
                        ? 'Loading...'
                        : 'N/A')}
                  </span>
                </div>
              )}

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
                      ? formatCurrency(member.monthlyIncome)
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Signature added below Occupation/Income */}
              <div className="pt-4 border-t border-border/10 space-y-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Signature
                </span>
                <div className="relative h-32 w-full rounded-xl border border-border/50 bg-muted/10 overflow-hidden group">
                  {member.signature ? (
                    <img
                      src={member.signature}
                      alt="Signature"
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-[10px] uppercase font-black tracking-widest">
                      No Signature
                    </div>
                  )}
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
