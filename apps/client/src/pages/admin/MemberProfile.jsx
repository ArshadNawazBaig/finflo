import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Pagination from '@/components/ui/Pagination';
import {
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  DollarSign,
  Pencil,
  Mail,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  ChevronRight,
  User,
  Info,
  X,
  Download,
  Loader2,
  ShieldCheck,
  FileBadge,
  Send,
  CheckCircle2,
  Building2,
  BadgeDollarSign,
  ImagePlus,
  BookOpen,
  XCircle,
  Hash,
  FileText,
  History,
  CreditCard,
} from 'lucide-react';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import SensitiveData from '@/components/ui/SensitiveData';
import api from '@/lib/axios';
import { formatCurrency, capitalize, formatCNIC, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import {
  exportMemberStatement,
  generateTransactionReceipt,
  exportAccountStatement,
} from '@/lib/pdfExportUtils';
import { savePdf } from '@/lib/nativeDownload';
import SignaturePad from '@/components/ui/SignaturePad';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/useIsMobile';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';
import MemberProfileSkeleton from '@/components/member/MemberProfileSkeleton';
import MemberAvatar from '@/components/member/MemberAvatar';
import TransactionTimeline from '@/components/member/TransactionTimeline';
import AssociatedLoans from '@/components/member/AssociatedLoans';
import TermDepositsSection from '@/components/member/TermDepositsSection';
import MemberTierPicker from '@/components/admin/MemberTierPicker';
import BusinessShareSection from '@/components/member/BusinessShareSection';
import CheckbookSection from '@/components/member/CheckbookSection';
import MemberAuditLog from '@/components/member/MemberAuditLog';
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
  const [downloadingAccount, setDownloadingAccount] = useState(null); // 'current' | 'saving' | null

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [showProfitRateForm, setShowProfitRateForm] = useState(false);
  const [newProfitRate, setNewProfitRate] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferAccountType, setTransferAccountType] = useState('current');
  const [isTransferring, setIsTransferring] = useState(false);
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
  const [isSubmittingProfitRate, setIsSubmittingProfitRate] = useState(false);
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [shareProfitRate, setShareProfitRate] = useState('');
  const [isFetchingMoreShares, setIsFetchingMoreShares] = useState(false);
  const [shareLimit, setShareLimit] = useState(5);
  const [deductFromBalance, setDeductFromBalance] = useState(false);

  // Checkbook state
  const [checkbooks, setCheckbooks] = useState([]);
  const [showCheckbookForm, setShowCheckbookForm] = useState(false);
  const [checkbookLeaves, setCheckbookLeaves] = useState(25);
  const [checkbookNotes, setCheckbookNotes] = useState('');
  const [isIssuingCheckbook, setIsIssuingCheckbook] = useState(false);
  const [isCheckbooksLoading, setIsCheckbooksLoading] = useState(false);
  const [checkbookPage, setCheckbookPage] = useState(1);
  const [checkbookTotalPages, setCheckbookTotalPages] = useState(1);
  const [checkbookTotal, setCheckbookTotal] = useState(0);
  const [isCancellingCheckbook, setIsCancellingCheckbook] = useState(null);

  // Term Deposit state
  const [termDeposits, setTermDeposits] = useState([]);
  const [isTermDepositsLoading, setIsTermDepositsLoading] = useState(false);
  const [showTermDepositForm, setShowTermDepositForm] = useState(false);
  const [tdPrincipal, setTdPrincipal] = useState('');
  const [tdDuration, setTdDuration] = useState(6);
  const [tdSourceAccount, setTdSourceAccount] = useState('current');
  const [tdNotes, setTdNotes] = useState('');
  const [isSubmittingTD, setIsSubmittingTD] = useState(false);
  const [systemSettings, setSystemSettings] = useState(null);
  const [isBreakingTD, setIsBreakingTD] = useState(null);
  const [isMaturingTD, setIsMaturingTD] = useState(null);
  const [breakTDTarget, setBreakTDTarget] = useState(null); // term deposit to break

  // Transaction Confirm Modal State
  const [showTxnConfirm, setShowTxnConfirm] = useState(false);
  const [pendingTxnType, setPendingTxnType] = useState(null); // 'transfer'

  const investmentObserverTarget = useRef(null);
  const loanObserverTarget = useRef(null);
  const shareObserverTarget = useRef(null);

  const fetchMemberData = useCallback(async () => {
    try {
      setLoading(true);
      const [memberRes, investmentsRes, profitsRes, tdRes, settingsRes] =
        await Promise.all([
          api.get(`/members/${id}`),
          api.get(`/members/${id}/investments?page=1&limit=${itemsPerPage}`),
          api.get(`/members/${id}/profits`),
          api.get(`/term-deposits/${id}`),
          api.get(`/system-settings/business-config`),
        ]);
      setMember(memberRes.data);
      setTermDeposits(tdRes.data || []);
      setSystemSettings(settingsRes.data || null);
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
    setPendingTxnType('transfer');
    setShowTxnConfirm(true);
  };

  const executeTransfer = async () => {
    setShowTxnConfirm(false);
    setPendingTxnType(null);
    setIsTransferring(true);
    try {
      await api.post('/members/admin/transfer', {
        senderId: id,
        recipientIdentifier: recipientIdentifier.trim(),
        amount: parseFloat(transferAmount),
        accountType: transferAccountType,
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

  // ── Checkbook handlers ──────────────────────────────────────────────────────
  const fetchCheckbooks = useCallback(
    async (page = 1) => {
      setIsCheckbooksLoading(true);
      try {
        const { data } = await api.get(
          `/checkbooks/member/${id}?page=${page}&limit=5`,
        );
        setCheckbooks(data.checkbooks || []);
        setCheckbookPage(data.currentPage || 1);
        setCheckbookTotalPages(data.totalPages || 1);
        setCheckbookTotal(data.total || 0);
      } catch (error) {
        console.error('Failed to load checkbooks:', error);
      } finally {
        setIsCheckbooksLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id) fetchCheckbooks(1);
  }, [id, fetchCheckbooks]);

  const handleIssueCheckbook = async (e) => {
    e.preventDefault();
    setIsIssuingCheckbook(true);
    try {
      const { data } = await api.post('/checkbooks/issue', {
        memberId: id,
        numberOfLeaves: checkbookLeaves,
        notes: checkbookNotes,
      });
      toast.success(data.message || 'Checkbook issued successfully');
      setCheckbookLeaves(25);
      setCheckbookNotes('');
      setShowCheckbookForm(false);
      fetchMemberData();
      fetchCheckbooks(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue checkbook');
    } finally {
      setIsIssuingCheckbook(false);
    }
  };

  const handleCancelCheckbook = async (checkbookId, refund = false) => {
    setIsCancellingCheckbook(checkbookId);
    try {
      const { data } = await api.put(`/checkbooks/${checkbookId}/cancel`, {
        refund,
      });
      toast.success(data.message || 'Checkbook cancelled');
      fetchMemberData();
      fetchCheckbooks(checkbookPage);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to cancel checkbook',
      );
    } finally {
      setIsCancellingCheckbook(null);
    }
  };

  const handleUpdateCheckbookStatus = async (checkbookId, status) => {
    setIsCancellingCheckbook(checkbookId);
    try {
      const { data } = await api.put(`/checkbooks/${checkbookId}/status`, {
        status,
      });
      toast.success(data.message || `Checkbook status updated to ${status}`);
      fetchMemberData();
      fetchCheckbooks(checkbookPage);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update checkbook status',
      );
    } finally {
      setIsCancellingCheckbook(null);
    }
  };
  // ────────────────────────────────────────────────────────────────────────────


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
      setIsExportingModal(true);

      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const {
        renderPdfHeader,
        renderPdfFooter,
        getBusinessContext,
        toTitleCase,
        renderPdfSignatures,
      } = await import('@/lib/pdfExportUtils');

      // Fetch ALL transactions for the member within the selected range (ignoring pagination)
      const { data } = await api.get(`/members/${id}/investments`, {
        params: {
          page: 1,
          limit: 1000, // Fetch up to 1000 records for the report
          startDate: startOfDay(reportDateRange.from).toISOString(),
          endDate: endOfDay(reportDateRange.to).toISOString(),
        },
      });

      const reportData = data.investments || [];
      if (!reportData.length) {
        toast.error(
          'No transactions found for this member in the selected date range',
        );
        return;
      }

      const ctx = getBusinessContext();
      const doc = new jsPDF();

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Member Activity Statement',
        leftDetails: [
          {
            label: 'Account Holder',
            value: toTitleCase(member?.name || 'Valued Member'),
          },
          {
            label: 'Member ID',
            value: member?.memberId || id?.slice(-6).toUpperCase() || 'N/A',
          },
          { label: 'CNIC', value: member?.cnic || 'N/A' },
        ],
        rightDetails: [
          { label: 'Statement Date', value: new Date().toLocaleDateString() },
          {
            label: 'Report Period',
            value: `${reportDateRange.from.toLocaleDateString()} - ${reportDateRange.to.toLocaleDateString()}`,
          },
          { label: 'Currency', value: ctx.currency },
        ],
      });

      const tableColumn = [
        'Date',
        'Description',
        'Type',
        'Amount',
        'Balance after',
      ];
      const tableRows = reportData.map((item) => {
        const isWithdrawal = item.type?.toLowerCase() === 'withdrawal';
        return [
          new Date(item.date).toLocaleDateString(),
          item.description,
          item.type.toUpperCase(),
          `${isWithdrawal ? '-' : ''}${formatCurrency(item.amount)}`,
          formatCurrency(item.balanceAfter || 0),
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY,
        theme: 'grid',
        headStyles: {
          fillColor: [64, 53, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        alternateRowStyles: { fillColor: [250, 250, 255] },
        margin: { left: 14, right: 14 },
      });

      const finalY = doc.lastAutoTable?.finalY || startY + 20;
      await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });

      renderPdfFooter(doc, { businessContext: ctx });

      await savePdf(
        doc,
        `Member_Report_${member.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`,
      );
      toast.success('Member statement downloaded successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Statement Generation Error:', error);
      toast.error('Failed to generate statement');
    } finally {
      setIsExportingModal(false);
    }
  };

  // Download monthly statement for a single account (current or saving).
  // Period defaults to the previous calendar month — backend handles default.
  const handleDownloadAccountStatement = async (accountType) => {
    try {
      setDownloadingAccount(accountType);
      const { data } = await api.get(`/members/${id}/account-statement`, {
        params: { accountType },
      });
      await exportAccountStatement(data, member);
      toast.success(
        `${accountType === 'saving' ? 'Saving' : 'Current'} account statement downloaded`,
      );
    } catch (error) {
      console.error('Account Statement Error:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to generate account statement',
      );
    } finally {
      setDownloadingAccount(null);
    }
  };

  // Term Deposit Handlers
  const handleCreateTermDeposit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingTD(true);
      await api.post('/term-deposits', {
        memberId: id,
        principal: Number(tdPrincipal),
        duration: Number(tdDuration),
        sourceAccount: tdSourceAccount,
        notes: tdNotes,
      });
      toast.success('Term deposit created successfully');
      setShowTermDepositForm(false);
      setTdPrincipal('');
      setTdNotes('');
      fetchMemberData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create term deposit',
      );
    } finally {
      setIsSubmittingTD(false);
    }
  };

  const handleBreakTermDeposit = async (tdId) => {
    try {
      setIsBreakingTD(tdId);
      const { data } = await api.post(`/term-deposits/${tdId}/break`);
      toast.success(data.message || 'Term deposit broken safely');
      setBreakTDTarget(null);
      fetchMemberData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to break term deposit',
      );
    } finally {
      setIsBreakingTD(null);
    }
  };

  const handleMatureTermDeposit = async (tdId) => {
    try {
      setIsMaturingTD(tdId);
      const { data } = await api.post(`/term-deposits/${tdId}/mature`);
      toast.success(data.message || 'Term deposit matured');
      fetchMemberData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to mature term deposit',
      );
    } finally {
      setIsMaturingTD(null);
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
                : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 border border-slate-100 dark:border-white/[0.06]'
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
              <SensitiveData maskLength={15} iconSize={13}>
                {member.cnic}
              </SensitiveData>
            </div>
            <div className="w-1 h-1 bg-border rounded-full hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Clock size={14} className="text-primary" />
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </div>
          </div>
        }
      >
        <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
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

            <Tooltip content="Issue Checkbook">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCheckbookForm(true)}
                className="w-12 h-12 rounded-2xl bg-indigo-500/5 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/10"
              >
                <BookOpen size={18} />
              </Button>
            </Tooltip>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end">
            <Button
              isLoading={isExportingModal}
              onClick={() => {
                setReportDateRange({
                  from: subMonths(new Date(), 1),
                  to: new Date(),
                });
                setIsExportModalOpen(true);
              }}
              className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Download size={16} />
              Report
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4">
        <StatsCard
          title="Current Account"
          amount={formatCurrency(member.currentBalance || 0)}
          icon={<Wallet size={18} />}
          color="bg-primary text-primary border-primary/20"
          sensitive
          isGlass
        />
        <StatsCard
          title="Saving Account"
          amount={formatCurrency(member.savingBalance || 0)}
          icon={<BadgeDollarSign size={18} />}
          color="bg-teal-500 text-teal-600 border-teal-500/20"
          sensitive
          isGlass
        />
        <StatsCard
          title="Loan Eligibility"
          amount={formatCurrency(member.creditLimit || 0)}
          icon={<ShieldCheck size={18} />}
          color="bg-amber-500 text-amber-600 border-amber-500/20"
          sensitive
          isGlass
        />
        <StatsCard
          title="Saving Profit"
          amount={formatCurrency(member.totalSavingProfit || 0)}
          icon={<TrendingUp size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          sensitive
          isGlass
        />
        {/* <StatsCard
          title="Principal Invested"
          amount={formatCurrency(member.totalInvested || 0)}
          icon={<DollarSign size={18} />}
          color="bg-blue-500 text-blue-600 border-blue-500/20"
          sensitive
          isGlass
        /> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Forms (Injected) */}
          {(showProfitRateForm ||
            showTransferForm ||
            showMemberForm ||
            showCheckbookForm) && (
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
                      <BookOpen size={20} />
                    )}
                  </div>
                  {showMemberForm
                    ? 'Edit Member Profile'
                    : showProfitRateForm
                      ? 'Performance Configuration'
                      : showTransferForm
                        ? 'P2P Fund Transfer'
                        : 'Issue Checkbook'}
                </h3>
                <button
                  onClick={() => {
                    setShowProfitRateForm(false);
                    setShowTransferForm(false);
                    setShowMemberForm(false);
                    setShowCheckbookForm(false);
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
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="Enter complete address..."
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
                      className="flex-1 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Apply Rate
                    </Button>
                  </div>
                </form>
              ) : showTransferForm ? (
                <form onSubmit={handleTransfer} className="space-y-6">
                  <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl w-fit">
                    <button
                      type="button"
                      onClick={() => setTransferAccountType('current')}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        transferAccountType === 'current'
                          ? 'bg-primary text-white shadow-lg'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Current
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferAccountType('saving')}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        transferAccountType === 'saving'
                          ? 'bg-teal-500 text-white shadow-lg'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Saving
                    </button>
                  </div>
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
                      className="w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      {!isTransferring && <Send size={16} className="mr-2" />}
                      Initiate Transfer
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleIssueCheckbook} className="space-y-6">
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                      <Info size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Fee Deduction Notice
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                      A fee of{' '}
                      <strong className="text-indigo-600">
                        {formatCurrency(
                          systemSettings?.checkbookFees?.[checkbookLeaves] ?? 0,
                        )}
                      </strong>{' '}
                      will be deducted from the member's{' '}
                      <strong>current account</strong>. Current balance:{' '}
                      <strong className="text-primary">
                        {formatCurrency(member.currentBalance || 0)}
                      </strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Number of Leaves
                      </label>
                      <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl">
                        {[25, 50, 100].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCheckbookLeaves(val)}
                            className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-0.5 ${
                              checkbookLeaves === val
                                ? 'bg-indigo-500 text-white shadow-lg'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <span>{val} Leaves</span>
                            <span
                              className={`text-[9px] font-bold ${checkbookLeaves === val ? 'text-white/70' : 'text-muted-foreground/50'}`}
                            >
                              {formatCurrency(
                                systemSettings?.checkbookFees?.[val] ?? 0,
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={checkbookNotes}
                        onChange={(e) => setCheckbookNotes(e.target.value)}
                        placeholder="e.g. Requested by member"
                        className="w-full px-5 py-4 rounded-2xl border border-border/50 bg-muted/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="submit"
                      isLoading={isIssuingCheckbook}
                      className="w-full md:w-auto px-12 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                    >
                      {!isIssuingCheckbook && (
                        <BookOpen size={16} className="mr-2" />
                      )}
                      Issue Checkbook
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          <TransactionTimeline
            investments={investments}
            isInvestmentsLoading={isInvestmentsLoading}
            isMobile={isMobile}
            hasMoreInvestments={hasMoreInvestments}
            investmentObserverTarget={investmentObserverTarget}
            isFetchingMoreInvestments={isFetchingMoreInvestments}
            investmentPage={investmentPage}
            investmentTotalPages={investmentTotalPages}
            investmentTotal={investmentTotal}
            itemsPerPage={itemsPerPage}
            handleInvestmentPageChange={handleInvestmentPageChange}
            member={member}
          />
          {/* Associated Loans Section */}
          <AssociatedLoans
            loans={loans}
            isMobile={isMobile}
            hasMoreLoans={hasMoreLoans}
            loanObserverTarget={loanObserverTarget}
            isFetchingMoreLoans={isFetchingMoreLoans}
          />
          {/* Nominee Details Card */}
          {(member.customer?.nominee?.name ||
            member.customer?.nominee?.cnic ||
            member.customer?.nominee?.relation) && (
            <div className="bg-white dark:bg-slate-900 border border-amber-500/30 p-5 sm:p-10 rounded-[2.5rem] shadow-sm space-y-6 mt-8">
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
                      className="block relative h-48 w-full md:w-3/4 rounded-2xl border border-border/50 bg-white dark:bg-slate-800 overflow-hidden group/nom-cnic shadow-sm hover:border-amber-500/50 transition-colors"
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

          {/* Guarantors Details Card */}
          {member.guarantors?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-blue-500/30 p-5 sm:p-10 rounded-[2.5rem] shadow-sm space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <ShieldCheck size={20} className="text-blue-500" />
                  Guarantors
                </h3>
                <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  {member.guarantors.length}{' '}
                  {member.guarantors.length === 1 ? 'Guarantor' : 'Guarantors'}
                </div>
              </div>

              <div className="space-y-3">
                {member.guarantors.slice(0, 2).map((g) => (
                  <div
                    key={g._id}
                    onClick={() => navigate(`/members/${g._id}`)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-muted/20 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <MemberAvatar
                        name={g.name || '?'}
                        profilePicture={g.profilePicture}
                        size={40}
                        rounded="rounded-full"
                        className="bg-blue-500/10 text-blue-600 text-sm"
                      />
                      <div>
                        <div className="text-sm font-black capitalize group-hover:text-blue-600 transition-colors">
                          {g.name || 'Unknown'}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {formatCNIC?.(g.cnic) || g.cnic || 'No CNIC'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          g.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : g.status === 'rejected'
                              ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}
                      >
                        {g.status || 'pending'}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground/40 group-hover:text-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {member.guarantors.length > 2 && (
                <button
                  onClick={() => navigate(`/members/${id}/guarantors`)}
                  className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-500/5 border border-blue-500/10 transition-all"
                >
                  Show All {member.guarantors.length} Guarantors
                </button>
              )}
            </div>
          )}

          {/* Acting as Guarantor Card */}
          {member.actingAsGrantor?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-purple-500/30 p-5 sm:p-10 rounded-[2.5rem] shadow-sm space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <FileBadge size={20} className="text-purple-500" />
                  Acting as Guarantor
                </h3>
                <div className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                  {member.actingAsGrantor.length}{' '}
                  {member.actingAsGrantor.length === 1 ? 'Loan' : 'Loans'}
                </div>
              </div>

              <div className="space-y-3">
                {member.actingAsGrantor.slice(0, 2).map((g) => (
                  <div
                    key={g.loanId}
                    onClick={() => navigate(`/loans/${g.loanId}`)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-muted/20 hover:bg-purple-500/5 hover:border-purple-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <MemberAvatar
                        name={g.customerName || '?'}
                        profilePicture={g.customerProfilePicture}
                        size={40}
                        rounded="rounded-full"
                        className="bg-purple-500/10 text-purple-600 text-sm"
                      />
                      <div>
                        <div className="text-sm font-black capitalize group-hover:text-purple-600 transition-colors">
                          {g.customerName}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                          Loan: {formatCurrency(g.loanAmount)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          g.loanStatus === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : g.loanStatus === 'completed'
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              : g.loanStatus === 'defaulted'
                                ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}
                      >
                        {g.loanStatus}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground/40 group-hover:text-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {member.actingAsGrantor.length > 2 && (
                <button
                  onClick={() => navigate(`/members/${id}/guarantors`)}
                  className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-purple-500 hover:bg-purple-500/5 border border-purple-500/10 transition-all"
                >
                  Show All {member.actingAsGrantor.length} Loans
                </button>
              )}
            </div>
          )}

          {/* ── Transfer Limits Tier Picker ──────────────────────── */}
          <div className="mt-8">
            <MemberTierPicker
              memberId={member._id}
              currentTierId={member.transferLimitTier}
            />
          </div>

          {/* ── Term Deposits Section ─────────────────────────────── */}
          <TermDepositsSection
            showTermDepositForm={showTermDepositForm}
            setShowTermDepositForm={setShowTermDepositForm}
            handleCreateTermDeposit={handleCreateTermDeposit}
            tdPrincipal={tdPrincipal}
            setTdPrincipal={setTdPrincipal}
            tdDuration={tdDuration}
            setTdDuration={setTdDuration}
            systemSettings={systemSettings}
            tdSourceAccount={tdSourceAccount}
            setTdSourceAccount={setTdSourceAccount}
            member={member}
            tdNotes={tdNotes}
            setTdNotes={setTdNotes}
            isSubmittingTD={isSubmittingTD}
            termDeposits={termDeposits}
            isMaturingTD={isMaturingTD}
            handleMatureTermDeposit={handleMatureTermDeposit}
            isBreakingTD={isBreakingTD}
            setBreakTDTarget={setBreakTDTarget}
          />
          {/* ── Business Share Section ─────────────────────────────── */}
          <BusinessShareSection
            member={member}
            shareFormType={shareFormType}
            setShareFormType={setShareFormType}
            showShareForm={showShareForm}
            setShowShareForm={setShowShareForm}
            handleShareSubmit={handleShareSubmit}
            shareAmount={shareAmount}
            setShareAmount={setShareAmount}
            useShareCustomRates={useShareCustomRates}
            setUseShareCustomRates={setUseShareCustomRates}
            sharePeriod={sharePeriod}
            setSharePeriod={setSharePeriod}
            deductFromBalance={deductFromBalance}
            setDeductFromBalance={setDeductFromBalance}
            isSubmittingShare={isSubmittingShare}
            isSharesLoading={isSharesLoading}
            shares={shares}
            isMobile={isMobile}
            shareCurrentPage={shareCurrentPage}
            shareTotalPages={shareTotalPages}
            shareObserverTarget={shareObserverTarget}
            isFetchingMoreShares={isFetchingMoreShares}
            shareTotal={shareTotal}
            shareLimit={shareLimit}
            fetchMemberShares={fetchMemberShares}
            setShareLimit={setShareLimit}
            setShareCurrentPage={setShareCurrentPage}
            shareDescription={shareDescription}
            setShareDescription={setShareDescription}
          />
          {/* ────────────────────────────────────────────────────────── */}

          {/* ── Checkbook Section ──────────────────────────────────── */}
          <CheckbookSection
            checkbookTotal={checkbookTotal}
            isCheckbooksLoading={isCheckbooksLoading}
            checkbooks={checkbooks}
            handleUpdateCheckbookStatus={handleUpdateCheckbookStatus}
            isCancellingCheckbook={isCancellingCheckbook}
            handleCancelCheckbook={handleCancelCheckbook}
            checkbookTotalPages={checkbookTotalPages}
            checkbookPage={checkbookPage}
            fetchCheckbooks={fetchCheckbooks}
          />
          {/* ────────────────────────────────────────────────────────── */}

          {/* ── Audit Timeline ───────────────────────────────────────── */}
          <MemberAuditLog memberId={id} />
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Wallet size={10} className="text-primary" />
                      Saving Account
                    </span>
                    {member.savingAccountNumber && (
                      <button
                        type="button"
                        onClick={() => handleDownloadAccountStatement('saving')}
                        disabled={downloadingAccount === 'saving'}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 disabled:opacity-50"
                        title="Download last month's statement"
                      >
                        {downloadingAccount === 'saving' ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Download size={10} />
                        )}
                        Statement
                      </button>
                    )}
                  </div>
                  <span className="text-sm font-black font-mono text-primary">
                    {member.savingAccountNumber || 'Not Assigned'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Wallet size={10} className="text-indigo-500" />
                      Current Account
                    </span>
                    {member.currentAccountNumber && (
                      <button
                        type="button"
                        onClick={() => handleDownloadAccountStatement('current')}
                        disabled={downloadingAccount === 'current'}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 disabled:opacity-50"
                        title="Download last month's statement"
                      >
                        {downloadingAccount === 'current' ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Download size={10} />
                        )}
                        Statement
                      </button>
                    )}
                  </div>
                  <span className="text-sm font-black font-mono text-indigo-500">
                    {member.currentAccountNumber || 'Not Assigned'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Wallet size={10} className="text-amber-500" />
                    Loan Account
                  </span>
                  <span className="text-sm font-black font-mono text-amber-500">
                    {member.loanAccountNumber || 'Not Assigned'}
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

      {/* Report Selection Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl bg-background">
          {/* Fixed Header */}
          <div className="p-8 border-b bg-background z-10 shrink-0 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Download size={24} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  Member Statement
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                  Select a custom date range for {member?.name}&apos;s activity
                  report.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="space-y-6">
              <div className="">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block text-center">
                  Select Report Period
                </label>
                <div className="flex justify-center">
                  <DateRangePicker
                    date={reportDateRange}
                    setDate={setReportDateRange}
                    className=""
                  />
                </div>
                <p className="text-[9px] text-center text-muted-foreground mt-4 leading-relaxed font-medium">
                  Note: Generating reports for long periods may take a few
                  moments.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => setIsExportModalOpen(false)}
              className="flex-1 rounded-[1.25rem] min-h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              disabled={isExportingModal}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleDownloadReport}
              disabled={isExportingModal}
              className="flex-1 min-h-14 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all border border-primary/20 text-white"
            >
              {isExportingModal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} className="mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Confirmation Modal */}
      <TransactionConfirmModal
        isOpen={showTxnConfirm}
        onClose={() => {
          setShowTxnConfirm(false);
          setPendingTxnType(null);
        }}
        onConfirm={executeTransfer}
        loading={isTransferring}
        type="transfer"
        amount={parseFloat(transferAmount) || 0}
        details={[
          { label: 'From', value: capitalize(member?.name || '') },
          {
            label: 'To',
            value: transferRecipientName || recipientIdentifier,
          },
          {
            label: 'Account',
            value: transferAccountType === 'saving' ? 'Saving' : 'Current',
          },
        ]}
        description={transferDescription}
        isAdminTransaction
      />

      {/* Break Term Deposit Confirmation Modal */}
      {breakTDTarget &&
        (() => {
          const msElapsed =
            Date.now() - new Date(breakTDTarget.startDate).getTime();
          const monthsElapsed = Math.max(
            0,
            Math.floor(msElapsed / (1000 * 60 * 60 * 24 * 30)),
          );
          const fullProfit = Math.round(
            (breakTDTarget.principal *
              breakTDTarget.profitRate *
              (msElapsed / (1000 * 60 * 60 * 24 * 30))) /
              (12 * 100),
          );
          const penaltyRate = (breakTDTarget.earlyBreakPenaltyRate || 0) / 100;
          const actualProfit = Math.max(
            0,
            Math.round(fullProfit * (1 - penaltyRate)),
          );
          const totalReturn = breakTDTarget.principal + actualProfit;
          return (
            <TransactionConfirmModal
              isOpen={!!breakTDTarget}
              onClose={() => setBreakTDTarget(null)}
              onConfirm={() => handleBreakTermDeposit(breakTDTarget._id)}
              loading={isBreakingTD === breakTDTarget._id}
              type="custom"
              title="Break Term Deposit Early"
              amount={totalReturn}
              confirmText="Break Deposit"
              details={[
                {
                  label: 'Deposit',
                  value: breakTDTarget.depositNumber || 'N/A',
                },
                {
                  label: 'Principal',
                  value: formatCurrency(breakTDTarget.principal),
                },
                { label: 'Months Elapsed', value: `${monthsElapsed} months` },
                {
                  label: 'Penalty Rate',
                  value: `${breakTDTarget.earlyBreakPenaltyRate || 0}%`,
                },
                {
                  label: 'Profit After Penalty',
                  value: formatCurrency(actualProfit),
                },
                {
                  label: 'Est. Total Return',
                  value: formatCurrency(totalReturn),
                },
              ]}
              description={`Breaking this deposit early will apply a ${breakTDTarget.earlyBreakPenaltyRate || 0}% penalty on accrued profit. The estimated return of ${formatCurrency(totalReturn)} will be credited to the member's ${breakTDTarget.sourceAccount || 'current'} account.`}
              isAdminTransaction
            />
          );
        })()}
    </div>
  );
};

export default MemberProfile;
