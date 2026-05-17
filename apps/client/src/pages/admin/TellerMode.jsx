import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Zap,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  User,
  X,
  CheckCircle2,
  Wallet,
  CreditCard,
  Clock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
  ChevronDown,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  BadgeDollarSign,
  ShieldCheck,
  HandCoins,
  Globe,
  Lock,
  Plus,
  Download,
  FileBadge,
  Building2,
  BookOpen,
  ScanLine,
  UserCheck,
  Phone,
  IdCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  isToday,
  isFuture,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import Pagination from '@/components/ui/Pagination';
import TransactionCard from '@/components/payments/TransactionCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  TellerStatsSkeleton,
  TellerMemberCardSkeleton,
  TellerJournalSkeleton,
  TellerSearchSkeleton,
  MemberTransactionsSkeleton,
} from '@/components/ui/PageSkeletons';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, formatCNIC, capitalize } from '@/lib/utils';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';
import SensitiveData, { SensitiveBalance } from '@/components/ui/SensitiveData';
import KycOcrScanner from '@/components/kyc/KycOcrScanner';
import MemberAvatar from '@/components/member/MemberAvatar';

const TellerMode = () => {
  const navigate = useNavigate();
  // ── Search State ──────────────────────────────
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // ── Selected Member State ─────────────────────
  const [member, setMember] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [activeLoans, setActiveLoans] = useState([]);

  // ── Action State ──────────────────────────────
  const [activeAction, setActiveAction] = useState(null); // 'deposit' | 'withdraw' | 'loan-pay'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountType, setAccountType] = useState('current'); // 'current' | 'saving'
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applyDeduction, setApplyDeduction] = useState(false);
  const [repaymentType, setRepaymentType] = useState('installment');
  const [lastActiveLoanPaymentDate, setLastActiveLoanPaymentDate] =
    useState(null);
  const [isFetchingActiveLoanPayment, setIsFetchingActiveLoanPayment] =
    useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'online'
  const [deductFromWallet, setDeductFromWallet] = useState(false);

  // ── Checkbook State ───────────────────────────
  const [memberCheckbooks, setMemberCheckbooks] = useState([]);
  const [selectedCheckbookId, setSelectedCheckbookId] = useState('');
  const [checkNo, setCheckNo] = useState('');
  // Who is presenting the check at the counter — defaults to the account holder.
  // If 'other', we capture the bearer's identity (name, CNIC, phone) for the
  // audit trail and KYC, with an OCR-scan option to auto-fill from a CNIC card.
  const [checkBearer, setCheckBearer] = useState('self'); // 'self' | 'other'
  const [bearerName, setBearerName] = useState('');
  const [bearerCnic, setBearerCnic] = useState('');
  const [bearerPhone, setBearerPhone] = useState('');
  const [cnicScannerOpen, setCnicScannerOpen] = useState(false);

  // ── Recent Transactions ───────────────────────
  const [recentTxns, setRecentTxns] = useState([]);
  const [recentTxnsPage, setRecentTxnsPage] = useState(1);
  const [recentTxnsTotalPages, setRecentTxnsTotalPages] = useState(0);
  const [isFetchingMoreRecent, setIsFetchingMoreRecent] = useState(false);
  const [recentTxnsLoading, setRecentTxnsLoading] = useState(false);
  const [recentTxnsLimit, setRecentTxnsLimit] = useState(5);
  const [recentTxnsTotalEntries, setRecentTxnsTotalEntries] = useState(0);
  const [sessionStatsLoading, setSessionStatsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cashIn: 0,
    cashOut: 0,
    net: 0,
  });

  // ── View Mode ─────────────────────────────────
  const [viewMode, setViewMode] = useState('pos'); // 'pos' | 'cashbook'
  const [isExportingMemberPdf, setIsExportingMemberPdf] = useState(false);
  const [isExportingCashbook, setIsExportingCashbook] = useState(false);
  const isMobile = useIsMobile();
  const observerTarget = useRef(null);
  const recentTxnsObserverTarget = useRef(null);
  const skipNextEffect = useRef(false);

  // ── Transaction Confirm Modal State ────────────
  const [showTxnConfirm, setShowTxnConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'deposit' | 'withdraw' | 'loan-pay'

  // ── Cash in Hand State ─────────────────────────
  const [cashbookDate, setCashbookDate] = useState(new Date());
  const [cashSummary, setCashSummary] = useState({
    openingCash: 0,
    cashIn: 0,
    cashOut: 0,
    closingCash: 0,
    hasOpening: false,
    isCarriedForward: false,
    totalTransactions: 0,
  });
  const [cashSummaryLoading, setCashSummaryLoading] = useState(false);
  const [cashOpeningInput, setCashOpeningInput] = useState('');
  const [cashOpeningDescription, setCashOpeningDescription] = useState('');
  const [showCashOpeningModal, setShowCashOpeningModal] = useState(false);
  const [isSettingOpening, setIsSettingOpening] = useState(false);
  const [cashTxns, setCashTxns] = useState([]);
  const [cashTxnsLoading, setCashTxnsLoading] = useState(false);
  const [cashTxnsPage, setCashTxnsPage] = useState(1);
  const [cashTxnsLimit, setCashTxnsLimit] = useState(10);
  const [cashTxnsTotalPages, setCashTxnsTotalPages] = useState(0);
  const [cashTxnsTotalEntries, setCashTxnsTotalEntries] = useState(0);
  const isCashbookToday = isToday(cashbookDate);
  const [showDenomModal, setShowDenomModal] = useState(false);

  // ── Branch Dropdown State ──────────────────────
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Denomination tracking
  const DENOMINATIONS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];
  const [denomCounts, setDenomCounts] = useState({
    d1: 0,
    d2: 0,
    d5: 0,
    d10: 0,
    d20: 0,
    d50: 0,
    d100: 0,
    d500: 0,
    d1000: 0,
    d5000: 0,
  });
  const [isSavingDenoms, setIsSavingDenoms] = useState(false);
  const denomTotal = DENOMINATIONS.reduce(
    (sum, d) => sum + d * (denomCounts[`d${d}`] || 0),
    0,
  );

  const [user] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const amountRef = useRef(null);

  // ── Keyboard Shortcuts ────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeAction) {
          setActiveAction(null);
          setAmount('');
          setDescription('');
        } else if (member) {
          clearMember();
        } else if (query) {
          setQuery('');
          setSearchResults([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAction, member, query]);

  // ── Search Members ────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchMembers();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const searchMembers = async () => {
    setIsSearching(true);
    try {
      const { data } = await api.get('/search', { params: { q: query } });
      const members = (data.results || []).filter((r) => r.type === 'Member');
      setSearchResults(members);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Select Member ─────────────────────────────
  const selectMember = async (memberId) => {
    setMemberLoading(true);
    setActiveAction(null);
    setAmount('');
    setDescription('');
    setSelectedLoan(null);
    setSearchResults([]);
    setQuery('');
    setSelectedCheckbookId('');
    try {
      const { data } = await api.get(`/members/${memberId}`);
      setMember(data);

      // Fetch active loans
      const loanRes = await api.get('/loans', {
        params: {
          customerId: data.customer?._id || data.customer,
          limit: 100,
        },
      });

      const filteredLoans = (loanRes.data?.data || loanRes.data || []).filter(
        (l) => l.status === 'active' || l.status === 'overdue',
      );

      setActiveLoans(filteredLoans);

      // Fetch member checkbooks
      try {
        const cbRes = await api.get(`/checkbooks/member/${memberId}?limit=20`);
        setMemberCheckbooks(cbRes.data.checkbooks || []);
      } catch {
        setMemberCheckbooks([]);
      }

      // Fetch recent transactions
      setRecentTxnsPage(1);
      fetchRecentTxns(memberId, 1, false);
    } catch (err) {
      toast.error('Failed to load member details');
      setMember(null);
    } finally {
      setMemberLoading(false);
    }
  };

  const fetchRecentTxns = async (
    memberId,
    page = 1,
    isAppend = false,
    limitOverride,
  ) => {
    if (!memberId) return;
    try {
      if (isAppend) {
        setIsFetchingMoreRecent(true);
      } else {
        setRecentTxnsLoading(true);
      }
      const { data } = await api.get('/ledger', {
        params: {
          member: memberId,
          limit: limitOverride || recentTxnsLimit,
          page: page,
          sortBy: 'date',
          sortOrder: 'desc',
        },
      });

      const txns = data?.data || [];
      if (isAppend) {
        setRecentTxns((prev) => {
          const existingIds = new Set(prev.map((t) => t._id));
          const newTransactions = txns.filter((t) => !existingIds.has(t._id));
          return [...prev, ...newTransactions];
        });
      } else {
        setRecentTxns(txns);
      }
      setRecentTxnsTotalPages(data?.totalPages || 0);
      setRecentTxnsTotalEntries(data?.totalEntries || 0);
      setRecentTxnsPage(page);
    } catch {
      if (!isAppend) setRecentTxns([]);
    } finally {
      setIsFetchingMoreRecent(false);
      setRecentTxnsLoading(false);
    }
  };

  const fetchSessionStats = async () => {
    setSessionStatsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get('/ledger', {
        params: { startDate: today, endDate: today, limit: 1 },
      });

      if (data.summary) {
        setSessionStats({
          cashIn: data.summary.totalIncome || 0,
          cashOut: data.summary.totalExpense || 0,
          net:
            (data.summary.totalIncome || 0) - (data.summary.totalExpense || 0),
        });
      }
    } catch {
      // Ignore
    } finally {
      setSessionStatsLoading(false);
    }
  };

  const getISODate = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return format(d, 'yyyy-MM-dd');
    } catch {
      return date;
    }
  };

  const handleExportMemberPDF = async () => {
    if (!member) return;
    try {
      setIsExportingMemberPdf(true);
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const {
        renderPdfHeader,
        renderPdfFooter,
        getBusinessContext,
        toTitleCase,
        renderPdfSignatures,
      } = await import('@/lib/pdfExportUtils');
      const { PDF_FONT, registerJakartaFonts } = await import('@/lib/pdfFonts');

      // Fetch ALL transactions for this member
      const { data } = await api.get('/ledger', {
        params: {
          member: member._id,
          limit: 2000,
          page: 1,
          sortBy: 'date',
          sortOrder: 'desc',
        },
      });

      const reportData = data?.data || [];
      if (!reportData.length) {
        toast.error('No transactions found for this member');
        return;
      }

      const ctx = getBusinessContext();
      const doc = new jsPDF();
      await registerJakartaFonts(doc);

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Member Activity Statement',
        leftDetails: [
          {
            label: 'Account Holder',
            value: toTitleCase(member.name || 'Member'),
          },
          {
            label: 'Member ID',
            value: member.memberId || member._id?.slice(-6).toUpperCase(),
          },
          { label: 'CNIC', value: member.cnic || 'N/A' },
        ],
        rightDetails: [
          { label: 'Statement Date', value: new Date().toLocaleDateString() },
          {
            label: 'Current Balance',
            value: formatCurrency(member.currentBalance || 0),
          },
          { label: 'Currency', value: ctx.currency },
        ],
      });

      const tableColumn = [
        'Date',
        'Description',
        'Type',
        'Amount',
        'Balance After',
      ];
      const tableRows = reportData.map((item) => {
        const isWithdrawal =
          item.type?.toLowerCase() === 'expense' || item.type === 'debit';
        return [
          format(new Date(item.date || item.createdAt), 'MMM dd, yyyy'),
          item.description || item.category?.replace(/_/g, ' ') || '—',
          (item.category || item.type || '').replace(/_/g, ' ').toUpperCase(),
          `${isWithdrawal ? '-' : '+'}${formatCurrency(item.amount)}`,
          item.balanceAfter != null ? formatCurrency(item.balanceAfter) : '—',
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
          fontSize: 8,
        },
        styles: { font: PDF_FONT, fontSize: 7.5, cellPadding: 3 },
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

      const { savePdf } = await import('@/lib/nativeDownload');
      await savePdf(
        doc,
        `Member_Statement_${(member.name || 'Member').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`,
      );
      toast.success('Member statement downloaded successfully');
    } catch (error) {
      console.error('Member PDF Export Error:', error);
      toast.error('Failed to generate member statement');
    } finally {
      setIsExportingMemberPdf(false);
    }
  };

  const handleExportCashbookPDF = async () => {
    try {
      setIsExportingCashbook(true);
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const {
        renderPdfHeader,
        renderPdfFooter,
        getBusinessContext,
        toTitleCase,
        renderPdfSignatures,
      } = await import('@/lib/pdfExportUtils');
      const { PDF_FONT, registerJakartaFonts } = await import('@/lib/pdfFonts');

      // Fetch ALL cash transactions for the selected date
      const { data } = await api.get('/ledger', {
        params: {
          startDate: startOfDay(cashbookDate).toISOString(),
          endDate: endOfDay(cashbookDate).toISOString(),
          paymentMethod: 'cash',
          page: 1,
          limit: 2000,
        },
      });

      const reportData = (data?.data || []).filter(
        (t) => t.category !== 'cash_opening',
      );

      const ctx = getBusinessContext();
      const doc = new jsPDF();
      await registerJakartaFonts(doc);
      const dateStr = format(cashbookDate, 'MMMM dd, yyyy');

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Cash In Hand Report',
        leftDetails: [
          { label: 'Generated By', value: toTitleCase(user?.name || 'Teller') },
          { label: 'Report Type', value: 'Daily Cash Book' },
        ],
        rightDetails: [
          { label: 'Report Date', value: dateStr },
          { label: 'Generated On', value: new Date().toLocaleString() },
        ],
      });

      // Cash Summary Table
      doc.setFontSize(10);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(0);
      doc.text('Cash Position Summary', 14, startY);

      autoTable(doc, {
        startY: startY + 4,
        head: [['Metric', 'Amount']],
        body: [
          ['Opening Cash', formatCurrency(cashSummary.openingCash)],
          ['Total Cash In', formatCurrency(cashSummary.cashIn)],
          ['Total Cash Out', `-${formatCurrency(cashSummary.cashOut)}`],
          ['Closing Cash', formatCurrency(cashSummary.closingCash)],
          ['Total Transactions', String(cashTxnsTotalEntries)],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [64, 53, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: { font: PDF_FONT, fontSize: 8, cellPadding: 4 },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [100, 100, 100] },
          1: { halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [250, 250, 255] },
        margin: { left: 14, right: 14 },
      });

      // Transaction Details
      if (reportData.length > 0) {
        const tableY = (doc.lastAutoTable?.finalY || 100) + 10;
        doc.setFontSize(10);
        doc.setFont(PDF_FONT, 'bold');
        doc.setTextColor(0);
        doc.text('Cash Transaction Details', 14, tableY);

        const tableRows = reportData.map((txn) => {
          const isIn =
            txn.type === 'income' ||
            (txn.category || '').includes('deposit') ||
            (txn.category || '').includes('repayment') ||
            (txn.category || '') === 'investment';
          return [
            format(new Date(txn.date || txn.createdAt), 'hh:mm a'),
            txn.member?.name || '\u2014',
            (txn.category || '').replace(/_/g, ' ').toUpperCase(),
            txn.description || txn.notes || '\u2014',
            !isIn ? `-${formatCurrency(txn.amount)}` : '\u2014',
            isIn ? `+${formatCurrency(txn.amount)}` : '\u2014',
          ];
        });

        autoTable(doc, {
          startY: tableY + 4,
          head: [
            [
              'Time',
              'Member',
              'Category',
              'Description',
              'Cash Out',
              'Cash In',
            ],
          ],
          body: tableRows,
          theme: 'grid',
          headStyles: {
            fillColor: [64, 53, 100],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
          },
          styles: { font: PDF_FONT, fontSize: 7.5, cellPadding: 3 },
          columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' },
            5: { halign: 'right', fontStyle: 'bold' },
          },
          alternateRowStyles: { fillColor: [250, 250, 255] },
          margin: { left: 14, right: 14 },
        });
      }

      const finalY = doc.lastAutoTable?.finalY || startY + 20;
      await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });
      renderPdfFooter(doc, { businessContext: ctx });

      const { savePdf } = await import('@/lib/nativeDownload');
      await savePdf(doc, `Cashbook_${format(cashbookDate, 'yyyyMMdd')}.pdf`);
      toast.success('Cashbook report downloaded');
    } catch (error) {
      console.error('Cashbook PDF Error:', error);
      toast.error('Failed to generate cashbook report');
    } finally {
      setIsExportingCashbook(false);
    }
  };

  useEffect(() => {
    fetchSessionStats();
  }, []);

  // Infinite scroll for mobile
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (
            viewMode === 'pos' &&
            member &&
            !isFetchingMoreRecent &&
            recentTxnsPage < recentTxnsTotalPages
          ) {
            fetchRecentTxns(member._id, recentTxnsPage + 1, true);
          }
        }
      },
      { threshold: 0.1 },
    );

    if (viewMode === 'pos' && recentTxnsObserverTarget.current) {
      observer.observe(recentTxnsObserverTarget.current);
    }

    return () => observer.disconnect();
  }, [
    isMobile,
    viewMode,
    isFetchingMoreRecent,
    recentTxnsPage,
    recentTxnsTotalPages,
    recentTxnsLimit,
    member,
  ]);

  // ── Action Handlers ───────────────────────────
  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0)
      return toast.error('Enter a valid amount');
    setIsProcessing(true);
    try {
      await api.post(`/members/${member._id}/invest`, {
        amount: parseFloat(amount),
        notes: description || undefined,
        accountType,
        paymentMethod,
        applyDeduction: accountType === 'current' ? applyDeduction : false,
        repaymentType:
          accountType === 'current' && applyDeduction
            ? repaymentType
            : undefined,
      });
      toast.success(
        `${formatCurrency(parseFloat(amount))} deposited to ${member.name}'s ${accountType} account`,
      );
      resetAfterAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deposit failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0)
      return toast.error('Enter a valid amount');
    // Bearer KYC is required when the check is being cashed by someone other
    // than the account holder, so the audit trail can identify who actually
    // received the funds.
    if (selectedCheckbookId && checkBearer === 'other') {
      if (!bearerName.trim()) return toast.error('Enter the bearer’s name');
      if (!bearerCnic.trim()) return toast.error('Enter the bearer’s CNIC');
    }
    setIsProcessing(true);
    try {
      const bearer = selectedCheckbookId
        ? checkBearer === 'self'
          ? { type: 'self' }
          : {
              type: 'other',
              name: bearerName.trim(),
              cnic: bearerCnic.trim(),
              phone: bearerPhone.trim() || undefined,
            }
        : undefined;
      await api.post(`/members/${member._id}/withdraw`, {
        amount: parseFloat(amount),
        notes: description || undefined,
        accountType,
        paymentMethod,
        checkbookId: selectedCheckbookId || undefined,
        checkNo: checkNo || undefined,
        bearer,
      });
      toast.success(
        `${formatCurrency(parseFloat(amount))} withdrawn from ${member.name}'s ${accountType} account`,
      );
      resetAfterAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoanPayment = async () => {
    if (!amount || parseFloat(amount) <= 0)
      return toast.error('Enter a valid amount');
    if (!selectedLoan) return toast.error('Select a loan first');
    setIsProcessing(true);
    try {
      await api.post('/repayments', {
        loanId: selectedLoan._id,
        amount: parseFloat(amount),
        paymentMethod,
        deductFromWallet,
        notes: description || 'POS loan payment',
      });
      toast.success(
        `${formatCurrency(parseFloat(amount))} loan repayment recorded for ${member.name}`,
      );
      resetAfterAction();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Loan payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAfterAction = async () => {
    setAmount('');
    setDescription('');
    setActiveAction(null);
    setSelectedLoan(null);
    setSelectedCheckbookId('');
    setCheckNo('');
    setCheckBearer('self');
    setBearerName('');
    setBearerCnic('');
    setBearerPhone('');
    // Refresh member data
    if (member) {
      await selectMember(member._id);
    }
    // Refresh session stats
    fetchSessionStats();
    // Refresh cash summary if on cashbook
    if (viewMode === 'cashbook') fetchCashSummary();
    // Focus search for next customer
    setPaymentMethod('cash');
    setDeductFromWallet(false);
    setTimeout(() => searchRef.current?.focus(), 300);
  };

  const clearMember = () => {
    setMember(null);
    setActiveLoans([]);
    setRecentTxns([]);
    setActiveAction(null);
    setAmount('');
    setDescription('');
    setSelectedLoan(null);
    setApplyDeduction(false);
    setRepaymentType('installment');
    setPaymentMethod('cash');
    setDeductFromWallet(false);
    setMemberCheckbooks([]);
    setSelectedCheckbookId('');
    setCheckNo('');
    setCheckBearer('self');
    setBearerName('');
    setBearerCnic('');
    setBearerPhone('');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  // ── Cash in Hand Functions ────────────────────

  // Resolve current branchId for cash APIs
  const cashBranchId = isAdmin
    ? selectedBranchId || ''
    : user?.managedBranchId || user?.branchId || '';

  // Fetch branches for admin dropdown
  useEffect(() => {
    if (isAdmin) {
      api
        .get('/branches')
        .then(({ data }) => {
          const list = data?.data || data || [];
          setBranches(list);
          if (list.length > 0 && !selectedBranchId) {
            setSelectedBranchId(list[0]._id);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchCashSummary = async (dateOverride) => {
    setCashSummaryLoading(true);
    try {
      const targetDate = dateOverride || cashbookDate;
      const dateParam = format(targetDate, 'yyyy-MM-dd');
      const params = { date: dateParam };
      if (cashBranchId) params.branchId = cashBranchId;
      const { data } = await api.get('/ledger/cash-summary', { params });
      setCashSummary(data);
      if (data.hasOpening || data.isCarriedForward) {
        setCashOpeningInput(String(data.openingCash));
        setCashOpeningDescription(data.description || '');
      } else {
        setCashOpeningInput('');
        setCashOpeningDescription('');
      }
      // Load saved denominations
      if (data.denominations) {
        setDenomCounts(data.denominations);
      }
    } catch {
      // Ignore
    } finally {
      setCashSummaryLoading(false);
    }
  };

  const fetchCashTxns = async (page = 1, dateOverride) => {
    setCashTxnsLoading(true);
    try {
      const targetDate = dateOverride || cashbookDate;
      const { data } = await api.get('/ledger', {
        params: {
          startDate: startOfDay(targetDate).toISOString(),
          endDate: endOfDay(targetDate).toISOString(),
          paymentMethod: 'cash',
          page,
          limit: cashTxnsLimit,
        },
      });
      // Filter out cash_opening entries from the display list
      const txns = (data?.data || []).filter(
        (t) => t.category !== 'cash_opening',
      );
      setCashTxns(txns);
      setCashTxnsTotalPages(data.totalPages || 0);
      setCashTxnsTotalEntries(data.totalEntries || 0);
      setCashTxnsPage(page);
    } catch {
      setCashTxns([]);
    } finally {
      setCashTxnsLoading(false);
    }
  };

  const handleSetCashOpening = async () => {
    const amt = parseFloat(cashOpeningInput);
    if (isNaN(amt) || amt < 0) return toast.error('Enter a valid amount');
    setIsSettingOpening(true);
    try {
      const body = { amount: amt, description: cashOpeningDescription };
      if (cashBranchId) body.branchId = cashBranchId;
      await api.post('/ledger/cash-opening', body);
      toast.success('Cash opening set successfully');
      fetchCashSummary();
      fetchCashTxns(1);
      setShowCashOpeningModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set cash opening');
    } finally {
      setIsSettingOpening(false);
    }
  };

  const handleSaveDenominations = async () => {
    setIsSavingDenoms(true);
    try {
      const body = { denominations: denomCounts };
      if (cashBranchId) body.branchId = cashBranchId;
      await api.post('/ledger/cash-denominations', body);
      toast.success('Denomination count saved');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to save denominations',
      );
    } finally {
      setIsSavingDenoms(false);
    }
  };

  // Fetch cash data when switching to cashbook tab, changing date, or changing branch
  useEffect(() => {
    if (viewMode === 'cashbook') {
      fetchCashSummary(cashbookDate);
      fetchCashTxns(1, cashbookDate);
    }
  }, [viewMode, cashTxnsLimit, cashbookDate, cashBranchId]);

  // ── Loan Auto-Deduction Helpers ────────────────
  const tellerActiveLoan = activeLoans.find(
    (l) => l.status === 'active' || l.status === 'overdue',
  );

  const getSettlementDetails = (loan) => {
    if (!loan)
      return { amount: 0, monthsElapsed: 0, interest: 0, isEarly: false };
    const start = new Date(loan.startDate);
    const now = new Date();
    let fullMonths =
      now.getFullYear() * 12 +
      now.getMonth() -
      (start.getFullYear() * 12 + start.getMonth());
    if (now.getDate() < start.getDate()) fullMonths -= 1;
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
    } else if (loan.interestType === 'compound') {
      // Compound: remainingAmount already includes compounded interest
      return {
        amount: Math.round(loan.remainingAmount),
        adjustedPrincipal: Math.round(loan.remainingAmount),
        adjustedInterest: Math.round(loan.compoundedAmount || 0),
        monthsElapsed: fullMonths,
        daysIntoMonth,
        isEarly: true,
      };
    } else if (loan.interestType === 'emi') {
      const monthlyRate = loan.rate / 12 / 100;
      const r = monthlyRate;
      const P = loan.principal;
      const E = loan.emi;
      const m = fullMonths;
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

  const tellerSettlementDetails = tellerActiveLoan
    ? getSettlementDetails(tellerActiveLoan)
    : null;

  const getAutoDeductionDailyDetails = () => {
    if (!tellerActiveLoan)
      return { daysPassed: 0, interestForDays: 0, adjustedAmount: 0 };
    const refDate =
      lastActiveLoanPaymentDate || new Date(tellerActiveLoan.startDate);
    const now = new Date();
    let diff = now.getTime() - refDate.getTime();
    if (diff < 0) diff = 0;
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
    let interestForDays, principalPerInstallment;

    if (tellerActiveLoan.interestType === 'compound') {
      // Compound: interest on remaining balance (which grows on missed payments)
      const monthlyInterest =
        (tellerActiveLoan.remainingAmount * tellerActiveLoan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      interestForDays = Math.round(dailyInterest * daysPassed);
      principalPerInstallment = Math.round(
        tellerActiveLoan.principal / (tellerActiveLoan.duration || 1),
      );
    } else {
      // Simple interest (default)
      const monthlyInterest =
        (tellerActiveLoan.principal * tellerActiveLoan.rate) / 1200;
      const dailyInterest = monthlyInterest / 30;
      interestForDays = Math.round(dailyInterest * daysPassed);
      principalPerInstallment = Math.round(
        tellerActiveLoan.principal / (tellerActiveLoan.duration || 1),
      );
    }

    const adjustedAmount = principalPerInstallment + interestForDays;
    return { daysPassed, interestForDays, adjustedAmount };
  };

  const autoDeductionDaily = getAutoDeductionDailyDetails();

  // Fetch last repayment date for active loan
  useEffect(() => {
    if (!tellerActiveLoan?._id) return;
    setIsFetchingActiveLoanPayment(true);
    api
      .get(
        `/repayments?loanId=${tellerActiveLoan._id}&limit=1&sortBy=date&sortOrder=desc`,
      )
      .then(({ data }) => {
        const reps = data?.data || [];
        if (reps.length > 0) {
          setLastActiveLoanPaymentDate(new Date(reps[0].date));
        } else {
          setLastActiveLoanPaymentDate(new Date(tellerActiveLoan.startDate));
        }
      })
      .catch(() =>
        setLastActiveLoanPaymentDate(new Date(tellerActiveLoan.startDate)),
      )
      .finally(() => setIsFetchingActiveLoanPayment(false));
  }, [tellerActiveLoan?._id]);

  const submitAction = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0)
      return toast.error('Enter a valid amount');
    if (activeAction === 'loan-pay' && !selectedLoan)
      return toast.error('Select a loan first');
    setPendingAction(activeAction);
    setShowTxnConfirm(true);
  };

  const executeConfirmedAction = () => {
    setShowTxnConfirm(false);
    if (pendingAction === 'deposit') handleDeposit();
    else if (pendingAction === 'withdraw') handleWithdraw();
    else if (pendingAction === 'loan-pay') handleLoanPayment();
    setPendingAction(null);
  };

  const getTxnConfirmType = () => {
    if (pendingAction === 'deposit') return 'credit';
    if (pendingAction === 'withdraw') return 'debit';
    if (pendingAction === 'loan-pay') return 'loan-payment';
    return 'custom';
  };

  const getTxnConfirmDetails = () => {
    const details = [];
    if (member)
      details.push({ label: 'Member', value: capitalize(member.name) });
    if (pendingAction !== 'loan-pay') {
      details.push({
        label: 'Account',
        value: accountType === 'saving' ? 'Saving Account' : 'Current Account',
      });
    }
    if (selectedLoan && pendingAction === 'loan-pay') {
      details.push({
        label: 'Loan',
        value: `#${selectedLoan.loanNumber || selectedLoan._id?.slice(-6)}`,
      });
    }
    details.push({
      label: 'Method',
      value:
        paymentMethod === 'cash'
          ? 'Cash'
          : paymentMethod === 'bank'
            ? 'Bank Transfer'
            : 'Online',
    });
    return details;
  };

  const actionConfig = {
    deposit: {
      label: 'Deposit',
      icon: ArrowDownCircle,
      color: 'emerald',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20',
      activeClass: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
      btnClass:
        'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      focusClass: 'focus:border-emerald-500 focus:ring-emerald-500',
    },
    withdraw: {
      label: 'Withdrawal',
      icon: ArrowUpCircle,
      color: 'rose',
      bgClass: 'bg-rose-500/10 border-rose-500/20',
      activeClass: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
      btnClass:
        'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20',
      focusClass: 'focus:border-rose-500 focus:ring-rose-500',
    },
    'loan-pay': {
      label: 'Loan Payment',
      icon: Banknote,
      color: 'indigo',
      bgClass: 'bg-indigo-500/10 border-indigo-500/20',
      activeClass: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30',
      btnClass:
        'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
      focusClass: 'focus:border-indigo-500 focus:ring-indigo-500',
    },
  };

  return (
    <div className="flex flex-col space-y-8 pb-20 animate-in fade-in duration-700 max-w-[1400px] mx-auto w-full">
      {/* ── Header ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Branch terminal
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
            Teller{' '}
            <span className="text-primary">
              {viewMode === 'pos' ? 'POS' : 'Cashbook'}
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Session active
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="flex items-center gap-1.5 text-xs">
              <Clock size={12} className="text-primary" />
              {new Date().toLocaleDateString('en-PK', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* ── View Switcher ────────────────────────── */}
        <div className="inline-flex p-1 rounded-full bg-slate-100/70 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] w-full md:w-auto">
          <button
            onClick={() => setViewMode('pos')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
              viewMode === 'pos'
                ? 'bg-white dark:bg-white/[0.06] text-primary shadow-[0_4px_14px_-6px_rgba(15,23,42,0.18)]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap size={12} />
            Quick POS
          </button>

          <button
            onClick={() => setViewMode('cashbook')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-all ${
              viewMode === 'cashbook'
                ? 'bg-white dark:bg-white/[0.06] text-emerald-600 shadow-[0_4px_14px_-6px_rgba(15,23,42,0.18)]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HandCoins size={12} />
            Cash in Hand
          </button>
        </div>
      </div>

      {/* ── POS View ─────────────────────────────── */}
      {viewMode === 'pos' && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Left Column: Member Search & Info (4 cols) ── */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <div className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] relative z-10 group">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
                Member search
              </p>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Name, CNIC, phone…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-11 pr-11 py-3.5 rounded-full bg-slate-50/60 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium placeholder:text-slate-400"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* keyboard indicator */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                <kbd className="px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] font-sans text-[9px] text-slate-500 dark:text-slate-400">
                  ESC
                </kbd>
                to clear
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-3 p-2 bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] z-50 overflow-hidden"
                  >
                    <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => selectMember(result.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-primary/5 group"
                        >
                          <MemberAvatar
                            name={result.title || '?'}
                            profilePicture={result.profilePicture}
                            size={40}
                            rounded="rounded-xl"
                            className="group-hover:bg-primary group-hover:text-white transition-colors"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black capitalize truncate group-hover:text-primary transition-colors">
                              {result.title}
                            </p>
                            <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          <ChevronRight
                            size={14}
                            className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all"
                          />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] z-50">
                  <TellerSearchSkeleton />
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {memberLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TellerMemberCardSkeleton />
                </motion.div>
              ) : member ? (
                <motion.div
                  key="member"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <MemberAvatar
                            name={member.name}
                            profilePicture={member.profilePicture}
                            size={56}
                            className="text-xl"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold tracking-tight capitalize leading-tight text-slate-900 dark:text-white">
                            {member.name}
                          </h2>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1 font-mono">
                            <SensitiveData maskLength={14} iconSize={11}>
                              {member.currentAccountNumber}
                            </SensitiveData>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearMember}
                        className="p-2 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                        title="Clear Member"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {[
                        {
                          label: 'Current Account',
                          subLabel: member.currentAccountNumber,
                          value: member.currentBalance,
                          icon: Wallet,
                          color: 'emerald',
                        },
                        {
                          label: 'Saving Account',
                          subLabel: member.savingAccountNumber,
                          value: member.savingBalance,
                          icon: CreditCard,
                          color: 'primary',
                        },
                        {
                          label: 'Loan Account',
                          subLabel: member.loanAccountNumber,
                          value: activeLoans.reduce(
                            (sum, l) => sum + (l.remainingAmount || 0),
                            0,
                          ),
                          icon: Building2,
                          color: 'indigo',
                        },
                        {
                          label: 'Business Share',
                          value: member.shareBalance,
                          icon: Banknote,
                          color: 'amber',
                        },
                      ].map((card, i) => {
                        const tone = {
                          emerald: 'bg-emerald-500/10 text-emerald-500',
                          primary: 'bg-primary/10 text-primary',
                          indigo: 'bg-indigo-500/10 text-indigo-500',
                          amber: 'bg-amber-500/10 text-amber-500',
                        }[card.color];
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${tone}`}
                              >
                                <card.icon size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                  {card.label}
                                </span>
                                {card.subLabel && (
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-mono">
                                    {card.subLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                              <SensitiveBalance iconSize={12}>
                                {formatCurrency(card.value || 0)}
                              </SensitiveBalance>
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Guarantors Section */}
                    {member.guarantors?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <ShieldCheck size={12} className="text-blue-500" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/70">
                            Guarantors ({member.guarantors.length})
                          </span>
                        </div>
                        {member.guarantors.slice(0, 2).map((g) => (
                          <div
                            key={g._id}
                            className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer group"
                            onClick={() => selectMember(g._id)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <MemberAvatar
                                name={g.name || '?'}
                                profilePicture={g.profilePicture}
                                size={28}
                                rounded="rounded-lg"
                                className="bg-blue-500/10 text-blue-600 text-[10px]"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-black capitalize truncate group-hover:text-blue-600 transition-colors">
                                  {g.name || 'Unknown'}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground/60 truncate">
                                  <SensitiveData maskLength={15} iconSize={10}>
                                    {formatCNIC?.(g.cnic) ||
                                      g.cnic ||
                                      'No CNIC'}
                                  </SensitiveData>
                                </div>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                                g.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : g.status === 'rejected'
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {g.status || 'pending'}
                            </span>
                          </div>
                        ))}
                        {member.guarantors.length > 2 && (
                          <button
                            onClick={() =>
                              navigate(`/members/${member._id}/guarantors`)
                            }
                            className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-500/5 transition-colors"
                          >
                            Show All ({member.guarantors.length})
                          </button>
                        )}
                      </div>
                    )}

                    {/* Acting as Guarantor Section */}
                    {member.actingAsGrantor?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <FileBadge size={12} className="text-purple-500" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-500/70">
                            Guarantor For ({member.actingAsGrantor.length})
                          </span>
                        </div>
                        {member.actingAsGrantor.slice(0, 2).map((g) => (
                          <div
                            key={g.loanId}
                            className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <MemberAvatar
                                name={g.customerName || '?'}
                                profilePicture={g.customerProfilePicture}
                                size={28}
                                rounded="rounded-lg"
                                className="bg-purple-500/10 text-purple-600 text-[10px]"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-black capitalize truncate">
                                  {g.customerName}
                                </div>
                                <div className="text-[10px] text-muted-foreground/60">
                                  {formatCurrency(g.loanAmount)}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                                g.loanStatus === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : g.loanStatus === 'completed'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-red-500/10 text-red-600'
                              }`}
                            >
                              {g.loanStatus}
                            </span>
                          </div>
                        ))}
                        {member.actingAsGrantor.length > 2 && (
                          <button
                            onClick={() =>
                              navigate(`/members/${member._id}/guarantors`)
                            }
                            className="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-500 hover:bg-purple-500/5 transition-colors"
                          >
                            Show All ({member.actingAsGrantor.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-10 rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center text-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <Search size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Look up a member
                    </p>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
                      Search by name, CNIC, or phone to begin
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Column: Workspace (8 cols) ── */}
          <div className="lg:col-span-8 space-y-8">
            {/* Session Stats Grid */}
            {memberLoading || sessionStatsLoading ? (
              <TellerStatsSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {[
                  {
                    label: 'Today balance in',
                    value: sessionStats.cashIn,
                    tone: 'bg-emerald-500/10 text-emerald-500',
                    icon: ArrowDownCircle,
                  },
                  {
                    label: 'Today balance out',
                    value: sessionStats.cashOut,
                    tone: 'bg-rose-500/10 text-rose-500',
                    icon: ArrowUpCircle,
                  },
                  {
                    label: 'Net position',
                    value: sessionStats.net,
                    tone: 'bg-primary/10 text-primary',
                    icon: Wallet,
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 border border-slate-100 dark:border-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {stat.label}
                      </p>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${stat.tone}`}
                      >
                        <stat.icon size={14} />
                      </div>
                    </div>
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
                      {formatCurrency(stat.value)}
                    </h3>
                  </div>
                ))}
              </div>
            )}

            {/* Actions & Forms Area */}
            <AnimatePresence mode="wait">
              {member ? (
                <motion.div
                  key="tools"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-6"
                >
                  {/* Quick Action Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {Object.entries(actionConfig).map(([key, config]) => {
                      const Icon = config.icon;
                      const isActive = activeAction === key;
                      const tone = {
                        emerald: 'bg-emerald-500/10 text-emerald-500',
                        rose: 'bg-rose-500/10 text-rose-500',
                        indigo: 'bg-indigo-500/10 text-indigo-500',
                      }[config.color];
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setActiveAction(isActive ? null : key);
                            setAmount('');
                            setDescription('');
                            setSelectedLoan(null);
                            setAccountType('current');
                            setApplyDeduction(false);
                            setRepaymentType('installment');
                            setTimeout(() => amountRef.current?.focus(), 200);
                          }}
                          className={`group p-5 rounded-[2rem] border transition-all duration-300 flex items-center gap-4 text-left ${
                            isActive
                              ? `${config.activeClass} border-transparent`
                              : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]'
                          }`}
                        >
                          <div
                            className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                              isActive ? 'bg-white/20 text-white' : tone
                            }`}
                          >
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-extrabold tracking-tight leading-tight ${
                                isActive
                                  ? 'text-white'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {config.label}
                            </p>
                            <p
                              className={`text-[10px] font-medium mt-1 transition-colors ${
                                isActive
                                  ? 'text-white/70'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {key === 'deposit'
                                ? 'Process credit'
                                : key === 'withdraw'
                                  ? 'Process debit'
                                  : 'Loan repayment'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Form */}
                  <AnimatePresence>
                    {activeAction && (
                      <motion.form
                        initial={{ opacity: 0, height: 0, scale: 0.98 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.98 }}
                        onSubmit={submitAction}
                        className="p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-8 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${actionConfig[activeAction].activeClass}`}
                            >
                              {(() => {
                                const Icon = actionConfig[activeAction].icon;
                                return <Icon size={20} />;
                              })()}
                            </div>
                            <div>
                              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {actionConfig[activeAction].label}
                              </h3>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                                Complete fields to process
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveAction(null)}
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            {/* Account Selector */}
                            {activeAction !== 'loan-pay' && (
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                  Account Select
                                </label>
                                <div className="flex gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/50">
                                  {['current', 'saving'].map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => setAccountType(type)}
                                      className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        accountType === type
                                          ? `${actionConfig[activeAction].activeClass} shadow-lg shadow-black/5`
                                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                      }`}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Payment Method Selector */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                Payment Method
                              </label>
                              <div className="flex gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/50">
                                <button
                                  type="button"
                                  disabled={deductFromWallet}
                                  onClick={() => setPaymentMethod('cash')}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    deductFromWallet
                                      ? 'opacity-50 cursor-not-allowed bg-muted/20 text-muted-foreground/50'
                                      : paymentMethod === 'cash'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                  }`}
                                >
                                  <HandCoins size={14} />
                                  Cash
                                </button>
                                <button
                                  type="button"
                                  disabled={deductFromWallet}
                                  onClick={() => setPaymentMethod('online')}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    deductFromWallet
                                      ? 'opacity-60 cursor-not-allowed bg-blue-500/50 text-white'
                                      : paymentMethod === 'online'
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                  }`}
                                >
                                  <Globe size={14} />
                                  Online
                                </button>
                              </div>
                            </div>

                            {/* Via Checkbook Toggle & Selector (withdrawal only) */}
                            {activeAction === 'withdraw' &&
                              memberCheckbooks.filter(
                                (cb) =>
                                  cb.status === 'active' &&
                                  (cb.usedLeaves || 0) < cb.numberOfLeaves,
                              ).length > 0 && (
                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                                        <BookOpen size={16} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-black tracking-tight">
                                          Via Checkbook
                                        </p>
                                        <p className="text-[9px] text-muted-foreground font-medium">
                                          Withdraw against a checkbook leaf
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (selectedCheckbookId) {
                                          setSelectedCheckbookId('');
                                          setCheckNo('');
                                          setCheckBearer('self');
                                          setBearerName('');
                                          setBearerCnic('');
                                          setBearerPhone('');
                                        } else {
                                          const active = memberCheckbooks.find(
                                            (cb) =>
                                              cb.status === 'active' &&
                                              (cb.usedLeaves || 0) <
                                                cb.numberOfLeaves,
                                          );
                                          if (active)
                                            setSelectedCheckbookId(active._id);
                                        }
                                      }}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${selectedCheckbookId ? 'bg-amber-500' : 'bg-muted'}`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${selectedCheckbookId ? 'translate-x-6' : 'translate-x-1'}`}
                                      />
                                    </button>
                                  </div>

                                  {selectedCheckbookId && (
                                    <div className="space-y-2 pt-1">
                                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                        Select Checkbook
                                      </label>
                                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                                        {memberCheckbooks
                                          .filter(
                                            (cb) =>
                                              cb.status === 'active' &&
                                              (cb.usedLeaves || 0) <
                                                cb.numberOfLeaves,
                                          )
                                          .map((cb) => (
                                            <button
                                              key={cb._id}
                                              type="button"
                                              onClick={() =>
                                                setSelectedCheckbookId(cb._id)
                                              }
                                              className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between group ${
                                                selectedCheckbookId === cb._id
                                                  ? 'border-amber-500 bg-amber-500/5'
                                                  : 'border-border/30 hover:border-amber-500/30'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <div
                                                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                    selectedCheckbookId ===
                                                    cb._id
                                                      ? 'bg-amber-500 text-white'
                                                      : 'bg-amber-500/10 text-amber-600'
                                                  }`}
                                                >
                                                  <BookOpen size={12} />
                                                </div>
                                                <div>
                                                  <p className="text-[11px] font-black group-hover:text-amber-600 transition-colors">
                                                    {cb.checkbookNumber}
                                                  </p>
                                                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {cb.numberOfLeaves -
                                                      (cb.usedLeaves || 0)}{' '}
                                                    leaves left
                                                  </p>
                                                </div>
                                              </div>
                                              {selectedCheckbookId ===
                                                cb._id && (
                                                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white">
                                                  <CheckCircle2 size={10} />
                                                </div>
                                              )}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {selectedCheckbookId && (
                                    <div className="space-y-2 pt-1">
                                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                        Check No
                                      </label>
                                      <input
                                        type="text"
                                        value={checkNo}
                                        onChange={(e) =>
                                          setCheckNo(e.target.value)
                                        }
                                        placeholder="e.g. 001, 025"
                                        className="w-full px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm font-black focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:font-medium placeholder:text-muted-foreground/40"
                                      />
                                    </div>
                                  )}

                                  {/* Check Bearer Identification */}
                                  {selectedCheckbookId && (
                                    <div className="space-y-3 pt-1">
                                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                        Check Bearer
                                      </label>
                                      <div className="grid grid-cols-2 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCheckBearer('self');
                                            setBearerName('');
                                            setBearerCnic('');
                                            setBearerPhone('');
                                          }}
                                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                            checkBearer === 'self'
                                              ? 'border-amber-500 bg-amber-500/10 text-amber-700'
                                              : 'border-border/40 bg-card hover:border-amber-500/40 text-muted-foreground'
                                          }`}
                                        >
                                          <User size={12} />
                                          Self
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setCheckBearer('other')
                                          }
                                          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                            checkBearer === 'other'
                                              ? 'border-amber-500 bg-amber-500/10 text-amber-700'
                                              : 'border-border/40 bg-card hover:border-amber-500/40 text-muted-foreground'
                                          }`}
                                        >
                                          <UserCheck size={12} />
                                          Someone Else
                                        </button>
                                      </div>

                                      {checkBearer === 'other' && (
                                        <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2">
                                          {/* CNIC Scanner trigger */}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCnicScannerOpen(true)
                                            }
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-amber-700 hover:bg-amber-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                                          >
                                            <ScanLine size={14} />
                                            Scan CNIC to auto-fill
                                          </button>

                                          {/* Name */}
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-1">
                                              <User size={10} /> Bearer Name
                                            </label>
                                            <input
                                              type="text"
                                              value={bearerName}
                                              onChange={(e) =>
                                                setBearerName(e.target.value)
                                              }
                                              placeholder="Full name as on CNIC"
                                              className="w-full px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:font-medium placeholder:text-muted-foreground/40"
                                            />
                                          </div>

                                          {/* CNIC */}
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-1">
                                              <IdCard size={10} /> CNIC Number
                                            </label>
                                            <input
                                              type="text"
                                              value={bearerCnic}
                                              onChange={(e) =>
                                                setBearerCnic(
                                                  formatCNIC(e.target.value),
                                                )
                                              }
                                              placeholder="00000-0000000-0"
                                              inputMode="numeric"
                                              maxLength={15}
                                              className="w-full px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:font-medium placeholder:text-muted-foreground/40"
                                            />
                                          </div>

                                          {/* Phone */}
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-1">
                                              <Phone size={10} /> Phone
                                              <span className="text-muted-foreground/40 normal-case tracking-normal">
                                                (optional)
                                              </span>
                                            </label>
                                            <input
                                              type="tel"
                                              value={bearerPhone}
                                              onChange={(e) =>
                                                setBearerPhone(e.target.value)
                                              }
                                              placeholder="03XX-XXXXXXX"
                                              inputMode="tel"
                                              className="w-full px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:font-medium placeholder:text-muted-foreground/40"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Loan Selector */}
                            {activeAction === 'loan-pay' && (
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                  Loan Selection
                                </label>
                                {activeLoans.length === 0 ? (
                                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                                    <AlertTriangle
                                      size={16}
                                      className="text-amber-500 shrink-0"
                                    />
                                    <p className="text-xs font-bold text-amber-700/80">
                                      No active loans found.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[160px] overflow-y-auto px-1 custom-scrollbar">
                                    {activeLoans.map((loan) => (
                                      <button
                                        key={loan._id}
                                        type="button"
                                        onClick={() => setSelectedLoan(loan)}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between group ${
                                          selectedLoan?._id === loan._id
                                            ? 'border-indigo-500 bg-indigo-500/5'
                                            : 'border-border/30 hover:border-indigo-500/30'
                                        }`}
                                      >
                                        <div>
                                          <p className="text-sm font-black group-hover:text-indigo-600 transition-colors">
                                            {formatCurrency(loan.principal)}
                                          </p>
                                          <p className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase tracking-widest">
                                            Left:{' '}
                                            {formatCurrency(
                                              loan.remainingAmount,
                                            )}{' '}
                                            • {loan.duration}mo
                                            {loan.rate !== undefined
                                              ? ` • ${loan.rate}%`
                                              : ''}
                                          </p>
                                        </div>
                                        {selectedLoan?._id === loan._id && (
                                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white scale-110">
                                            <CheckCircle2 size={14} />
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Deduct from Wallet Toggle */}
                            {activeAction === 'loan-pay' && (
                              <div className="flex items-center justify-between p-4 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 mb-6">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-indigo-700">
                                    Deduct from Wallet
                                  </p>
                                  <p className="text-[9px] font-bold text-indigo-700/60">
                                    Pay using member's current balance
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextState = !deductFromWallet;
                                    setDeductFromWallet(nextState);
                                    if (nextState) setPaymentMethod('online');
                                  }}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                                    deductFromWallet
                                      ? 'bg-indigo-600'
                                      : 'bg-muted border border-border/50'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                                      deductFromWallet
                                        ? 'translate-x-6'
                                        : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            )}

                            {/* Desciption */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                Transaction Notes
                              </label>
                              <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add optional details..."
                                rows={2}
                                className="w-full px-5 py-4 rounded-2xl bg-muted/20 border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-xs font-medium resize-none"
                              />
                            </div>

                            {/* Loan Auto-Deduction */}
                            {activeAction === 'deposit' &&
                              accountType === 'current' &&
                              activeLoans.some(
                                (l) =>
                                  l.status === 'active' ||
                                  l.status === 'overdue',
                              ) && (
                                <div className="p-5 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4 animate-in slide-in-from-top-4 duration-500">
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
                                          Auto-repay active loan from this
                                          deposit.
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setApplyDeduction(!applyDeduction)
                                      }
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                                        applyDeduction
                                          ? 'bg-indigo-600'
                                          : 'bg-muted'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                                          applyDeduction
                                            ? 'translate-x-6'
                                            : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  {applyDeduction && tellerActiveLoan && (
                                    <div className="space-y-4 pt-2">
                                      {/* Loan Quick Info */}
                                      <div className="grid grid-cols-2 gap-4 px-2">
                                        <div className="space-y-1">
                                          <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">
                                            Current Remaining
                                          </p>
                                          <p className="text-xs font-black text-indigo-700">
                                            {formatCurrency(
                                              tellerActiveLoan.remainingAmount,
                                            )}
                                          </p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                          <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">
                                            Loan Type
                                          </p>
                                          <p className="text-[10px] font-black uppercase text-indigo-700">
                                            {tellerActiveLoan.interestType ||
                                              'Simple'}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRepaymentType('installment')
                                          }
                                          className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                                            repaymentType === 'installment'
                                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700'
                                              : 'border-border/50 hover:bg-muted'
                                          }`}
                                        >
                                          <div className="relative z-10">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                              <p className="text-[10px] font-black uppercase tracking-widest">
                                                EMI
                                              </p>
                                              {!isFetchingActiveLoanPayment && (
                                                <span className="text-[8px] font-black uppercase bg-indigo-500/20 text-indigo-600 px-1 py-0.5 rounded-full">
                                                  {
                                                    autoDeductionDaily.daysPassed
                                                  }
                                                  d
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
                                          onClick={() =>
                                            setRepaymentType('settlement')
                                          }
                                          className={`p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                                            repaymentType === 'settlement'
                                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700'
                                              : 'border-border/50 hover:bg-muted'
                                          }`}
                                        >
                                          <div className="relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                              SETTLE
                                            </p>
                                            <p className="text-[11px] font-black mt-0.5">
                                              {tellerSettlementDetails
                                                ? formatCurrency(
                                                    tellerSettlementDetails.amount,
                                                  )
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
                                                      tellerActiveLoan.emi,
                                                    ),
                                                  )
                                                : formatCurrency(
                                                    Math.min(
                                                      parseFloat(amount) || 0,
                                                      tellerSettlementDetails?.amount ||
                                                        0,
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
                                                    (repaymentType ===
                                                    'installment'
                                                      ? Math.min(
                                                          parseFloat(amount) ||
                                                            0,
                                                          tellerActiveLoan.emi,
                                                        )
                                                      : Math.min(
                                                          parseFloat(amount) ||
                                                            0,
                                                          tellerSettlementDetails?.amount ||
                                                            0,
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
                          </div>

                          <div className="space-y-6">
                            {/* Amount Input */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                Amount (PKR)
                              </label>
                              <div className="relative group/input">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground/20 group-focus-within/input:text-primary/30 transition-colors">
                                  Rs.
                                </span>
                                <input
                                  ref={amountRef}
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={amount}
                                  onChange={(e) => setAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-20 pr-8 py-8 rounded-[2rem] bg-muted/30 border-2 border-border/50 focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all text-4xl font-black tracking-tighter"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {[1000, 5000, 10000, 25000, 50000, 100000].map(
                                  (val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => setAmount(String(val))}
                                      className="px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-primary/10 border border-border/50 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all"
                                    >
                                      +{val / 1000}k
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>

                            {/* Submit */}
                            <Button
                              type="submit"
                              disabled={
                                isProcessing ||
                                !amount ||
                                (activeAction === 'loan-pay' && !selectedLoan)
                              }
                              isLoading={isProcessing}
                              className={`w-full h-20 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] ${actionConfig[activeAction].btnClass} shadow-xl shadow-primary/10 group relative overflow-hidden`}
                            >
                              {!isProcessing && (
                                <div className="flex flex-col items-center gap-1 group-hover:scale-105 transition-transform">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    <span>Process Transaction</span>
                                  </div>
                                  {amount && (
                                    <span className="text-[10px] opacity-60">
                                      Pay {formatCurrency(parseFloat(amount))}
                                    </span>
                                  )}
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Recent Activity Card */}
                  <div className="p-5 sm:p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                          Activity
                        </p>
                        <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                          Recent transactions
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportMemberPDF}
                        isLoading={isExportingMemberPdf}
                        disabled={recentTxns.length === 0}
                        className="rounded-full gap-2 text-[10px] font-bold uppercase tracking-[0.18em] border-slate-200 dark:border-white/[0.08] hover:bg-primary hover:text-white hover:border-primary transition-all h-9 px-4"
                      >
                        <Download size={14} />
                        PDF
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {recentTxnsLoading ? (
                        <MemberTransactionsSkeleton count={recentTxnsLimit} />
                      ) : recentTxns.length > 0 ? (
                        recentTxns.map((txn, i) => {
                          const isIn =
                            txn.type === 'income' ||
                            (txn.category || '').includes('repayment') ||
                            (txn.category || '').includes('deposit') ||
                            (txn.category || '') === 'investment';
                          return (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={txn._id || i}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all group"
                            >
                              <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                <div
                                  className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                                    isIn
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : 'bg-rose-500/10 text-rose-500'
                                  }`}
                                >
                                  {isIn ? (
                                    <ArrowDownCircle size={16} />
                                  ) : (
                                    <ArrowUpCircle size={16} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                                    {txn.description ||
                                      txn.category?.replace('_', ' ') ||
                                      'Transaction'}
                                  </p>
                                  {txn.notes && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-[200px]">
                                      {txn.notes}
                                    </p>
                                  )}
                                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                                    {format(
                                      new Date(txn.date || txn.createdAt),
                                      'MMM d, yyyy • p',
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 sm:pl-0 pt-2 sm:pt-0 border-t border-slate-100/60 dark:border-white/[0.04] sm:border-0 mt-2 sm:mt-0 w-full sm:w-auto shrink-0">
                                <div className="text-left sm:text-right">
                                  <p
                                    className={`text-sm font-extrabold tabular-nums ${
                                      isIn
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {isIn ? '+' : '-'}
                                    {formatCurrency(txn.amount)}
                                  </p>
                                  <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mt-0.5">
                                    Completed
                                  </p>
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { generateTransactionReceipt } =
                                        await import('@/lib/pdfExportUtils');
                                      await generateTransactionReceipt({
                                        member,
                                        type:
                                          txn.category ||
                                          txn.type ||
                                          'transaction',
                                        amount: txn.amount,
                                        description:
                                          txn.description || txn.notes || '',
                                        date: txn.date || txn.createdAt,
                                        balanceAfter: txn.balanceAfter,
                                        referenceId: txn._id,
                                        accountType:
                                          txn.accountType || 'current',
                                      });
                                      toast.success('Receipt downloaded');
                                    } catch (err) {
                                      console.error(err);
                                      toast.error('Failed to generate receipt');
                                    }
                                  }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
                                  title="Download Receipt"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-20 grayscale">
                          <LayoutGrid size={40} className="mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                            No Transactions Found
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pagination / Loading Status */}
                    {!recentTxnsLoading && (
                      <div className="mt-8">
                        {!isMobile && recentTxnsTotalPages > 1 && (
                          <div className="pt-6 border-t border-border/30">
                            <Pagination
                              currentPage={recentTxnsPage}
                              totalPages={recentTxnsTotalPages}
                              totalEntries={recentTxnsTotalEntries}
                              limit={recentTxnsLimit}
                              onPageChange={(p) =>
                                fetchRecentTxns(member._id, p, false)
                              }
                              onLimitChange={(newLimit) => {
                                setRecentTxnsLimit(newLimit);
                                setRecentTxnsPage(1);
                                fetchRecentTxns(member._id, 1, false, newLimit);
                              }}
                            />
                          </div>
                        )}

                        {isMobile && recentTxnsTotalPages > 1 && (
                          <div ref={recentTxnsObserverTarget} className="py-2">
                            <InfiniteLoader
                              isFetchingMore={isFetchingMoreRecent}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* Landing State when no member selected */
                <motion.div
                  key="landing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-[600px] rounded-[2rem] border border-dashed border-slate-200 dark:border-white/[0.08] bg-slate-50/40 dark:bg-white/[0.02] flex flex-col items-center justify-center text-center p-12 overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-opacity)_0%,transparent_70%)] opacity-[0.03] pointer-events-none" />
                  <div className="w-32 h-32 rounded-[3.5rem] bg-gradient-to-br from-primary/10 to-indigo-500/10 flex items-center justify-center mb-8 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-20" />
                    <User size={64} className="text-primary/20" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight mb-4">
                    Ready for Transaction
                  </h3>
                  <p className="text-sm text-muted-foreground/60 max-w-sm font-medium leading-relaxed">
                    Select a member from the sidebar to process deposits,
                    withdrawals, or loan repayments in real-time.
                  </p>

                  <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-left">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                        <Zap size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        Fast Entry
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground/50">
                        Use keyboard shortcuts for speed
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-left">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                        <FileText size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                        Auto Journal
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground/50">
                        Real-time ledger updates
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Journal View removed — use Ledger in Insights & Analytics */}
      {false && (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Journal Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-[2.5rem] bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Calendar size={18} />
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Daily Transaction Journal
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1 hidden lg:block">
                Select Date:
              </span>
              <DateRangePicker
                date={selectedDate}
                setDate={setSelectedDate}
                disabled={!isAdmin}
                className="w-full sm:w-auto"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJournalPDF}
                isLoading={isExportingJournal}
                disabled={journalTxns.length === 0}
                className="rounded-[1rem] gap-2 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-primary hover:text-white transition-all min-h-10 px-4 whitespace-nowrap w-full sm:w-auto mt-2 sm:mt-0"
              >
                <FileText size={14} />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Journal Stats (Exact POS Match) */}
          {journalLoading ? (
            <div className="mb-8">
              <TellerStatsSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {[
                {
                  label: 'Journal Cash In',
                  value: journalStats.cashIn,
                  color: 'emerald',
                  icon: ArrowDownCircle,
                },
                {
                  label: 'Journal Cash Out',
                  value: journalStats.cashOut,
                  color: 'rose',
                  icon: ArrowUpCircle,
                },
                {
                  label: 'Net Journal',
                  value: journalStats.net,
                  color: 'indigo',
                  icon: Zap,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-6 rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.02] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] rotate-12">
                    <stat.icon size={80} />
                  </div>
                  <div
                    className={`w-10 h-10 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500 flex items-center justify-center mb-4 shadow-sm`}
                  >
                    <stat.icon size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-black tracking-tighter`}>
                    {formatCurrency(stat.value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Journal Results Table Container */}
          <div className="py-4 px-1 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] md:bg-card md:border md:border-border/50 md:shadow-sm">
            {/* Journal Content */}
            <div className="space-y-6">
              {journalLoading && journalTxns.length === 0 ? (
                <TellerJournalSkeleton />
              ) : journalTxns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border-2 border-dashed border-border/50 rounded-[2rem]">
                  <FileText size={40} className="text-muted-foreground/30" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest">
                      No Records Found
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      There are no transactions recorded for{' '}
                      {selectedDate?.from
                        ? selectedDate?.to
                          ? `${getISODate(selectedDate.from)} to ${getISODate(selectedDate.to)}`
                          : getISODate(selectedDate.from)
                        : '...'}{' '}
                      .
                    </p>
                  </div>
                </div>
              ) : isMobile ? (
                /* Mobile Card View */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {journalTxns.map((txn) => (
                      <TransactionCard key={txn._id} transaction={txn} />
                    ))}
                  </div>

                  {/* Infinite Scroll Trigger */}
                  {journalPage < journalTotalPages && (
                    <div ref={observerTarget} className="py-4">
                      <InfiniteLoader isFetchingMore={isFetchingMoreJournal} />
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-left">
                          <th className="pb-4 pt-2 px-2 underline decoration-primary/30 decoration-2 underline-offset-8">
                            Date & Time
                          </th>
                          <th className="pb-4 pt-2 px-2 underline decoration-primary/30 decoration-2 underline-offset-8">
                            Member
                          </th>
                          <th className="pb-4 pt-2 px-2 underline decoration-primary/30 decoration-2 underline-offset-8">
                            Category
                          </th>
                          <th className="pb-4 pt-2 px-2 underline decoration-primary/30 decoration-2 underline-offset-8">
                            Notes
                          </th>
                          <th className="pb-4 pt-2 px-2 text-right underline decoration-primary/30 decoration-2 underline-offset-8">
                            Debit
                          </th>
                          <th className="pb-4 pt-2 px-2 text-right underline decoration-primary/30 decoration-2 underline-offset-8">
                            Credit
                          </th>
                          <th className="pb-4 pt-2 px-2 text-right underline decoration-primary/30 decoration-2 underline-offset-8">
                            Running Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {(() => {
                          // 1. Reverse the transactions to compute the running total chronologically
                          const journalWithBalances = [];
                          let runningSum = journalPriorBalance;

                          [...journalTxns].reverse().forEach((txn) => {
                            const isIn =
                              txn.type === 'income' ||
                              (txn.category || '').includes('repayment') ||
                              (txn.category || '').includes('deposit') ||
                              (txn.category || '') === 'investment';

                            runningSum += txn.amount * (isIn ? 1 : -1);
                            journalWithBalances.push({
                              ...txn,
                              computedBalance: runningSum,
                            });
                          });

                          // 2. Reverse back to descending order for the UI
                          return journalWithBalances.reverse().map((txn, i) => {
                            const isIn =
                              txn.type === 'income' ||
                              (txn.category || '').includes('repayment') ||
                              (txn.category || '').includes('deposit') ||
                              (txn.category || '') === 'investment';

                            return (
                              <tr
                                key={txn._id || i}
                                className="group hover:bg-muted/5 transition-colors"
                              >
                                <td className="py-5 px-2">
                                  <div className="flex items-center gap-2">
                                    <Clock
                                      size={12}
                                      className="text-muted-foreground"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                      {format(new Date(txn.date), 'MMM d, p')}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-5 px-2">
                                  <div className="flex items-center gap-2">
                                    {txn.member ? (
                                      <>
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                          {txn.member.name
                                            ?.charAt(0)
                                            .toUpperCase()}
                                        </div>
                                        <p className="text-sm font-black capitalize truncate max-w-[120px]">
                                          {txn.member.name}
                                        </p>
                                      </>
                                    ) : (
                                      <span className="text-xs font-bold text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-5 px-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 px-2 py-1 rounded-lg bg-muted/40 whitespace-nowrap">
                                    {txn.category?.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="py-5 px-2 max-w-[200px]">
                                  <p className="text-xs text-muted-foreground truncate italic">
                                    {txn.description ||
                                      txn.category?.replace(/_/g, ' ') ||
                                      '—'}
                                  </p>
                                  {txn.notes && (
                                    <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">
                                      {txn.notes}
                                    </p>
                                  )}
                                </td>
                                <td className="py-5 px-2 text-right">
                                  {!isIn ? (
                                    <p className="text-sm font-black text-rose-500">
                                      -{formatCurrency(txn.amount)}
                                    </p>
                                  ) : (
                                    <span className="text-xs font-bold text-muted-foreground/30">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="py-5 px-2 text-right">
                                  {isIn ? (
                                    <p className="text-sm font-black text-emerald-500">
                                      +{formatCurrency(txn.amount)}
                                    </p>
                                  ) : (
                                    <span className="text-xs font-bold text-muted-foreground/30">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="py-5 px-2 text-right">
                                  <p className="text-xs font-black text-muted-foreground">
                                    {formatCurrency(txn.computedBalance)}
                                  </p>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/20 font-black border-t-2 border-border/50">
                          <td
                            colSpan={4}
                            className="py-5 px-4 text-right text-[10px] uppercase tracking-widest text-muted-foreground/60"
                          >
                            Total Journal Summary
                          </td>
                          <td className="py-5 px-2 text-right text-sm text-rose-500">
                            -{formatCurrency(journalStats.cashOut)}
                          </td>
                          <td className="py-5 px-2 text-right text-sm text-emerald-500">
                            +{formatCurrency(journalStats.cashIn)}
                          </td>
                          <td className="py-5 px-2 text-right text-sm font-black text-primary bg-primary/5">
                            {formatCurrency(journalStats.net)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Pagination */}
                  {journalTotalPages > 1 && (
                    <div className="pt-6 border-t border-border/30">
                      <Pagination
                        currentPage={journalPage}
                        totalPages={journalTotalPages}
                        totalEntries={journalTotalEntries}
                        limit={journalLimit}
                        onPageChange={setJournalPage}
                        onLimitChange={(newLimit) => {
                          setJournalLimit(newLimit);
                          setJournalPage(1);
                          fetchJournal(false, 1, newLimit);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* End of Journal Summary */}
            <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/50 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Closing Net Balance for{' '}
                {selectedDate?.from
                  ? selectedDate?.to
                    ? `${getISODate(selectedDate.from)} to ${getISODate(selectedDate.to)}`
                    : getISODate(selectedDate.from)
                  : '...'}
              </p>
              <h4
                className={`text-xl font-bold ${journalStats.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                {formatCurrency(journalStats.net)}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* ── Cash in Hand View ─────────────────────── */}
      {viewMode === 'cashbook' && (
        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Date Navigation Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Daily journal
                </p>
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                  Cash in hand
                </h3>
              </div>
              {/* Branch Selector */}
              {isAdmin && branches.length > 0 && (
                <div className="relative ml-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06]">
                    <Building2 size={12} className="text-slate-400" />
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="bg-transparent text-[11px] font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none pr-4"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="text-slate-400 absolute right-3 pointer-events-none"
                    />
                  </div>
                </div>
              )}
              {!isAdmin && user?.branchName && (
                <span className="ml-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.18em]">
                  {user.branchName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCashbookDate((prev) => addDays(prev, -1))}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <DateRangePicker
                date={{ from: cashbookDate, to: cashbookDate }}
                setDate={(val) => {
                  if (val?.from) {
                    setCashbookDate(val.from);
                  }
                }}
                className="w-auto"
              />
              <button
                onClick={() => {
                  const next = addDays(cashbookDate, 1);
                  if (!isFuture(next) || isToday(next)) setCashbookDate(next);
                }}
                disabled={isToday(cashbookDate)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
              {!isCashbookToday && (
                <button
                  onClick={() => setCashbookDate(new Date())}
                  className="ml-1 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-emerald-500/20 transition-all"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Cash Opening Card */}
          <div className="p-6 sm:p-8 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <HandCoins size={22} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {isCashbookToday ? 'Today' : 'Historical'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Cash in hand
                    </h3>
                    {cashSummary.isCarriedForward && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-600 animate-in fade-in duration-300">
                        Carried forward
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {cashbookDate.toLocaleDateString('en-PK', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                {/* Opening Cash Input — only editable for today */}
                {isCashbookToday ? (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground/30">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={cashOpeningInput}
                        onChange={(e) => setCashOpeningInput(e.target.value)}
                        placeholder="Opening cash..."
                        disabled={cashSummary.hasOpening && !isAdmin}
                        className={`w-full sm:w-48 pl-12 pr-4 py-3 rounded-2xl border text-sm font-black transition-all ${
                          cashSummary.hasOpening
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700'
                            : 'bg-muted/30 border-border/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                        }`}
                      />
                      {cashSummary.hasOpening && (
                        <Lock
                          size={12}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/50"
                        />
                      )}
                    </div>
                    <Button
                      onClick={() => setShowCashOpeningModal(true)}
                      disabled={isSettingOpening || !cashOpeningInput}
                      isLoading={isSettingOpening}
                      className="h-12 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                      {!isSettingOpening && (
                        <>
                          {cashSummary.hasOpening ? (
                            <RefreshCw size={14} className="mr-1.5" />
                          ) : (
                            <Plus size={14} className="mr-1.5" />
                          )}
                          {cashSummary.hasOpening ? 'Update' : 'Set'}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted/30 border border-border/50">
                    <Lock size={14} className="text-muted-foreground/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Read-only (past date)
                    </span>
                  </div>
                )}

                <Button
                  onClick={() => setShowDenomModal(true)}
                  className="h-12 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] uppercase tracking-[0.18em] shadow-[0_10px_30px_-12px_rgba(245,158,11,0.45)] gap-2 transition-all w-full sm:w-auto"
                >
                  <Banknote size={16} />
                  Count cash counter
                  {denomTotal > 0 && (
                    <span className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                      {formatCurrency(denomTotal)}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Cash Summary Cards */}
          {cashSummaryLoading ? (
            <TellerStatsSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  label: 'Opening cash',
                  value: cashSummary.openingCash,
                  tone: 'bg-amber-500/10 text-amber-500',
                  icon: Wallet,
                },
                {
                  label: 'Cash in',
                  value: cashSummary.cashIn,
                  tone: 'bg-emerald-500/10 text-emerald-500',
                  icon: ArrowDownCircle,
                },
                {
                  label: 'Cash out',
                  value: cashSummary.cashOut,
                  tone: 'bg-rose-500/10 text-rose-500',
                  icon: ArrowUpCircle,
                },
                {
                  label: 'Closing cash',
                  value: cashSummary.closingCash,
                  tone: 'bg-indigo-500/10 text-indigo-500',
                  icon: HandCoins,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 border border-slate-100 dark:border-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {stat.label}
                    </p>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${stat.tone}`}
                    >
                      <stat.icon size={14} />
                    </div>
                  </div>
                  <h3
                    className={`text-xl font-extrabold tracking-tight tabular-nums leading-none ${
                      stat.label === 'Closing cash'
                        ? stat.value >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatCurrency(stat.value)}
                  </h3>
                </div>
              ))}
            </div>
          )}

          {/* Cash Transactions Log */}
          <div className="py-4 px-1 sm:p-8 rounded-[2rem] md:bg-white md:dark:bg-white/[0.02] md:border md:border-slate-100 md:dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Journal
                </p>
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                  {isCashbookToday
                    ? "Today's"
                    : format(cashbookDate, 'MMM d')}{' '}
                  cash transactions
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {cashTxnsTotalEntries} entr
                  {cashTxnsTotalEntries !== 1 ? 'ies' : 'y'}
                  {isCashbookToday ? ' today' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCashbookPDF}
                  isLoading={isExportingCashbook}
                  disabled={cashTxns.length === 0}
                  className="rounded-full gap-2 text-[10px] font-bold uppercase tracking-[0.18em] border-slate-200 dark:border-white/[0.08] hover:bg-primary hover:text-white hover:border-primary transition-all h-9 px-4"
                >
                  <Download size={14} />
                  PDF
                </Button>
                <button
                  onClick={() => {
                    fetchCashSummary(cashbookDate);
                    fetchCashTxns(cashTxnsPage, cashbookDate);
                  }}
                  className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-primary transition-all"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {cashTxnsLoading ? (
              <TellerJournalSkeleton />
            ) : cashTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02]">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <HandCoins size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No cash transactions yet
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Cash transactions processed today will appear here.
                  </p>
                </div>
              </div>
            ) : isMobile ? (
              <div className="space-y-4">
                {cashTxns.map((txn) => (
                  <TransactionCard key={txn._id} transaction={txn} />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/[0.06] text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 text-left">
                        <th className="pb-4 pt-2 px-2">Date &amp; time</th>
                        <th className="pb-4 pt-2 px-2">Member</th>
                        <th className="pb-4 pt-2 px-2">Category</th>
                        <th className="pb-4 pt-2 px-2">Notes</th>
                        <th className="pb-4 pt-2 px-2 text-right">Debit</th>
                        <th className="pb-4 pt-2 px-2 text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {cashTxns.map((txn, i) => {
                        const isIn =
                          txn.type === 'income' ||
                          (txn.category || '').includes('repayment') ||
                          (txn.category || '').includes('deposit') ||
                          (txn.category || '') === 'investment';
                        return (
                          <tr
                            key={txn._id || i}
                            className="group hover:bg-muted/5 transition-colors"
                          >
                            <td className="py-5 px-2">
                              <div className="flex items-center gap-2">
                                <Clock
                                  size={12}
                                  className="text-muted-foreground"
                                />
                                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                                  {format(new Date(txn.date), 'MMM d, p')}
                                </span>
                              </div>
                            </td>
                            <td className="py-5 px-2">
                              <div className="flex items-center gap-2">
                                {txn.member ? (
                                  <>
                                    <MemberAvatar
                                      name={txn.member.name}
                                      profilePicture={txn.member.profilePicture}
                                      size={28}
                                      rounded="rounded-lg"
                                      className="text-[10px]"
                                    />
                                    <p className="text-sm font-black capitalize truncate max-w-[120px]">
                                      {txn.member.name}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-xs font-bold text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-5 px-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 px-2 py-1 rounded-lg bg-muted/40 whitespace-nowrap">
                                {txn.category?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-5 px-2 max-w-[200px]">
                              <p className="text-xs text-muted-foreground truncate italic">
                                {txn.description ||
                                  txn.category?.replace(/_/g, ' ') ||
                                  '—'}
                              </p>
                            </td>
                            <td className="py-5 px-2 text-right">
                              {!isIn ? (
                                <p className="text-sm font-black text-rose-500">
                                  -{formatCurrency(txn.amount)}
                                </p>
                              ) : (
                                <span className="text-xs font-bold text-muted-foreground/30">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-5 px-2 text-right">
                              {isIn ? (
                                <p className="text-sm font-black text-emerald-500">
                                  +{formatCurrency(txn.amount)}
                                </p>
                              ) : (
                                <span className="text-xs font-bold text-muted-foreground/30">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {cashTxnsTotalPages > 1 && (
                  <div className="pt-6 border-t border-border/30">
                    <Pagination
                      currentPage={cashTxnsPage}
                      totalPages={cashTxnsTotalPages}
                      totalEntries={cashTxnsTotalEntries}
                      limit={cashTxnsLimit}
                      onPageChange={(p) => fetchCashTxns(p)}
                      onLimitChange={(newLimit) => {
                        setCashTxnsLimit(newLimit);
                        setCashTxnsPage(1);
                        fetchCashTxns(1);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Denomination Counter Modal */}
          <Dialog open={showDenomModal} onOpenChange={setShowDenomModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 gap-0">
              <DialogHeader className="p-6 pb-4 border-b border-border/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-black tracking-tight">
                      Denomination Counter
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-bold tracking-wide text-muted-foreground/60 mt-1">
                      {isCashbookToday
                        ? 'Count physical currency notes & coins'
                        : 'View only — historical date'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Notes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                  {DENOMINATIONS.map((d) => {
                    const key = `d${d}`;
                    const count = denomCounts[key] || 0;
                    const subtotal = d * count;
                    return (
                      <div
                        key={d}
                        className="p-2 rounded-xl bg-muted/20 border border-border/40 hover:border-amber-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-amber-600">
                            ₨{d.toLocaleString()}
                          </span>
                          <span className="text-[8px] font-black text-muted-foreground/40 tracking-wider">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setDenomCounts((prev) => ({
                                ...prev,
                                [key]: Math.max(0, (prev[key] || 0) - 1),
                              }))
                            }
                            disabled={!isCashbookToday || count === 0}
                            className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center font-black text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={count || ''}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setDenomCounts((prev) => ({
                                ...prev,
                                [key]: val,
                              }));
                            }}
                            placeholder="0"
                            disabled={!isCashbookToday}
                            className="w-full min-w-0 h-7 px-1 rounded-lg border border-border/50 bg-background text-center text-sm font-black focus:border-amber-500 focus:ring-1 focus:ring-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() =>
                              setDenomCounts((prev) => ({
                                ...prev,
                                [key]: (prev[key] || 0) + 1,
                              }))
                            }
                            disabled={!isCashbookToday}
                            className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center font-black text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reconciliation Summary */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/15">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                        Cash Count
                      </p>
                      <p className="text-xl font-black tracking-tighter">
                        {formatCurrency(denomTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                        Expected
                      </p>
                      <p className="text-xl font-black tracking-tighter">
                        {formatCurrency(cashSummary.closingCash)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                        Difference
                      </p>
                      {(() => {
                        const diff = denomTotal - cashSummary.closingCash;
                        const isMatch = Math.abs(diff) < 1;
                        return (
                          <div>
                            <p
                              className={`text-xl font-black tracking-tighter ${
                                isMatch ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isMatch
                                ? '✓ Match'
                                : (diff > 0 ? '+' : '') + formatCurrency(diff)}
                            </p>
                            {!isMatch && (
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${
                                  diff > 0
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : 'bg-rose-500/10 text-rose-600'
                                }`}
                              >
                                {diff > 0 ? 'Excess' : 'Short'}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isCashbookToday && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDenomCounts(
                          Object.fromEntries(
                            DENOMINATIONS.map((d) => [`d${d}`, 0]),
                          ),
                        );
                      }}
                      className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                    >
                      Reset All
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleSaveDenominations();
                        setShowDenomModal(false);
                      }}
                      disabled={isSavingDenoms}
                      isLoading={isSavingDenoms}
                      className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20"
                    >
                      {!isSavingDenoms && 'Save & Close'}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Cash Opening Setup Modal */}
          <Dialog
            open={showCashOpeningModal}
            onOpenChange={setShowCashOpeningModal}
          >
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-card border-border/50 rounded-3xl">
              {/* Header */}
              <div className="relative p-6 pb-4 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                    <HandCoins size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      {cashSummary.hasOpening ? 'Update' : 'Set'} Cash in Hand
                    </h3>
                    <p className="text-[11px] font-bold text-muted-foreground/80 tracking-wide mt-1">
                      {format(cashbookDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block pl-1">
                    Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-emerald-500 font-bold text-sm">
                        Rs.
                      </span>
                    </div>
                    <input
                      type="text"
                      value={cashOpeningInput}
                      disabled
                      className="w-full h-12 pl-12 pr-4 rounded-xl border border-border/50 bg-muted/30 text-emerald-600 font-black tracking-tight focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block pl-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={cashOpeningDescription}
                    onChange={(e) => setCashOpeningDescription(e.target.value)}
                    placeholder="Enter reason for update or additional notes..."
                    rows={3}
                    className="w-full p-4 rounded-xl border border-border/50 bg-background text-sm resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCashOpeningModal(false)}
                    className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSetCashOpening}
                    disabled={isSettingOpening}
                    isLoading={isSettingOpening}
                    className="flex-[2] h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                  >
                    {!isSettingOpening &&
                      `Confirm ${cashSummary.hasOpening ? 'Update' : 'Set'}`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Closing Cash Summary */}
          <div className="p-6 rounded-[2rem] bg-gradient-to-r from-emerald-500/5 to-indigo-500/5 border border-emerald-500/20 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Closing Cash Balance for{' '}
              {isCashbookToday ? 'Today' : format(cashbookDate, 'MMM d, yyyy')}
            </p>
            <h4
              className={`text-2xl font-black ${cashSummary.closingCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {formatCurrency(cashSummary.closingCash)}
            </h4>
            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2">
              Opening {formatCurrency(cashSummary.openingCash)}
              {cashSummary.isCarriedForward ? ' (C/F)' : ''} + In{' '}
              {formatCurrency(cashSummary.cashIn)} − Out{' '}
              {formatCurrency(cashSummary.cashOut)}
            </p>
          </div>
        </div>
      )}

      {/* ── POS Specific Views (Retired in Sidebar) ───────────────────── */}
      {/* Handled in the split-layout above */}

      {/* ── Transaction Confirmation Modal ─────────────────────────────── */}
      <TransactionConfirmModal
        isOpen={showTxnConfirm}
        onClose={() => {
          setShowTxnConfirm(false);
          setPendingAction(null);
        }}
        onConfirm={executeConfirmedAction}
        loading={isProcessing}
        type={getTxnConfirmType()}
        amount={parseFloat(amount) || 0}
        details={getTxnConfirmDetails()}
        description={description || undefined}
        isAdminTransaction
      />

      {/* ── CNIC Scanner (Check Bearer KYC) ────────────────────────────── */}
      <Dialog open={cnicScannerOpen} onOpenChange={setCnicScannerOpen}>
        <DialogContent className="sm:max-w-[500px] !p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-amber-500/10 via-background to-background p-8">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner shrink-0">
                  <ScanLine className="w-7 h-7" />
                </div>
                <div className="text-left min-w-0 pr-8">
                  <DialogTitle className="text-xl font-black tracking-tight">
                    Scan Check Bearer CNIC
                  </DialogTitle>
                  <DialogDescription className="text-xs font-medium mt-1">
                    Upload or capture the bearer&rsquo;s ID — name, CNIC and
                    phone will auto-fill below.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <KycOcrScanner
              onDataExtracted={(data) => {
                if (data?.name) setBearerName(data.name);
                if (data?.cnic) setBearerCnic(formatCNIC(data.cnic));
                if (data?.phone) setBearerPhone(data.phone);
                setCnicScannerOpen(false);
              }}
            />

            <p className="mt-6 text-[9px] text-center text-muted-foreground/50 font-medium tracking-wide uppercase">
              All bearer details are stored on the withdrawal record for audit
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TellerMode;
