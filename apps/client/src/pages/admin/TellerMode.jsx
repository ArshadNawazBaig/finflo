import { useState, useEffect, useCallback, useRef } from 'react';
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
import { formatCurrency, formatCNIC } from '@/lib/utils';

const TellerMode = () => {
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

  // ── Journal State ─────────────────────────────
  const [viewMode, setViewMode] = useState('pos'); // 'pos' | 'journal' | 'cashbook'
  const [selectedDate, setSelectedDate] = useState({
    from: new Date(),
    to: new Date(),
  });
  const [journalTxns, setJournalTxns] = useState([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const [isExportingJournal, setIsExportingJournal] = useState(false);
  const [isExportingMemberPdf, setIsExportingMemberPdf] = useState(false);
  const [isExportingCashbook, setIsExportingCashbook] = useState(false);
  const [isFetchingMoreJournal, setIsFetchingMoreJournal] = useState(false);
  const [journalStats, setJournalStats] = useState({
    cashIn: 0,
    cashOut: 0,
    net: 0,
  });
  const [journalPage, setJournalPage] = useState(1);
  const [journalLimit, setJournalLimit] = useState(5);
  const [journalTotalPages, setJournalTotalPages] = useState(0);
  const [journalTotalEntries, setJournalTotalEntries] = useState(0);
  const [journalPriorBalance, setJournalPriorBalance] = useState(0);
  const isMobile = useIsMobile();
  const observerTarget = useRef(null);
  const recentTxnsObserverTarget = useRef(null);
  const skipNextEffect = useRef(false);

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
  const [isSettingOpening, setIsSettingOpening] = useState(false);
  const [cashTxns, setCashTxns] = useState([]);
  const [cashTxnsLoading, setCashTxnsLoading] = useState(false);
  const [cashTxnsPage, setCashTxnsPage] = useState(1);
  const [cashTxnsLimit, setCashTxnsLimit] = useState(10);
  const [cashTxnsTotalPages, setCashTxnsTotalPages] = useState(0);
  const [cashTxnsTotalEntries, setCashTxnsTotalEntries] = useState(0);
  const isCashbookToday = isToday(cashbookDate);
  const [showDenomModal, setShowDenomModal] = useState(false);

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

  const handleExportJournalPDF = async () => {
    try {
      setIsExportingJournal(true);
      const { exportJournalPDF } = await import('@/lib/pdfExportUtils');

      // Fetch ALL journal records for the selected date range
      const { data } = await api.get('/ledger', {
        params: {
          startDate: startOfDay(selectedDate?.from || new Date()).toISOString(),
          endDate: endOfDay(
            selectedDate?.to || selectedDate?.from || new Date(),
          ).toISOString(),
          page: 1,
          limit: 2000,
        },
      });

      const success = await exportJournalPDF(data, selectedDate, user);
      if (success) {
        toast.success('Journal exported successfully!');
      } else {
        toast.error('No transactions found to export.');
      }
    } catch (error) {
      console.error('Failed to export Journal PDF:', error);
      toast.error('Failed to export journal.');
    } finally {
      setIsExportingJournal(false);
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
        const isWithdrawal = item.type?.toLowerCase() === 'expense';
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

      doc.save(
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
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
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
          fontSize: 9,
        },
        styles: { fontSize: 9, cellPadding: 4 },
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
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Cash Transaction Details', 14, tableY);

        const tableRows = reportData.map((txn) => {
          const isIn =
            txn.type === 'income' ||
            (txn.category || '').includes('deposit') ||
            (txn.category || '').includes('repayment');
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
            fontSize: 9,
          },
          styles: { fontSize: 8, cellPadding: 3 },
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

      doc.save(`Cashbook_${format(cashbookDate, 'yyyyMMdd')}.pdf`);
      toast.success('Cashbook report downloaded');
    } catch (error) {
      console.error('Cashbook PDF Error:', error);
      toast.error('Failed to generate cashbook report');
    } finally {
      setIsExportingCashbook(false);
    }
  };

  const fetchJournal = async (
    isAppend = false,
    pageOverride,
    limitOverride,
  ) => {
    if (viewMode !== 'journal') return;

    if (isAppend) {
      setIsFetchingMoreJournal(true);
    } else {
      setJournalLoading(true);
    }

    try {
      const pageToFetch =
        pageOverride || (isAppend ? journalPage + 1 : journalPage);
      const startDate = startOfDay(
        selectedDate?.from || new Date(),
      ).toISOString();
      const endDate = endOfDay(
        selectedDate?.to || selectedDate?.from || new Date(),
      ).toISOString();

      const { data } = await api.get('/ledger', {
        params: {
          startDate,
          endDate,
          page: pageToFetch,
          limit: limitOverride || journalLimit,
        },
      });

      const txns = data?.data || [];

      if (isAppend) {
        setJournalTxns((prev) => {
          const existingIds = new Set(prev.map((t) => t._id));
          const newTransactions = txns.filter((t) => !existingIds.has(t._id));
          return [...prev, ...newTransactions];
        });
        skipNextEffect.current = true;
        setJournalPage(pageToFetch);
      } else {
        setJournalTxns(txns);
      }

      setJournalTotalPages(data.totalPages || 0);
      setJournalTotalEntries(data.totalEntries || 0);
      setJournalPriorBalance(data.priorPageBalance || 0);

      // Stats should represent the whole range, but here we just use what we have or rethink if stats should be paginated
      // For now, keep the stats calculation based on the fetched chunk or request a separate summary if the API supports it
      // Usually, stats for a range are better served by a summary endpoint or total range fetch
      if (data.summary) {
        setJournalStats({
          cashIn: data.summary.totalIncome || 0,
          cashOut: data.summary.totalExpense || 0,
          net:
            (data.summary.totalIncome || 0) - (data.summary.totalExpense || 0),
        });
      }
    } catch (err) {
      console.error('Failed to fetch journal', err);
      toast.error('Failed to load journal records');
      if (!isAppend) setJournalTxns([]);
    } finally {
      setJournalLoading(false);
      setIsFetchingMoreJournal(false);
    }
  };

  useEffect(() => {
    fetchSessionStats();
  }, []);

  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }
    setJournalPage(1);
    fetchJournal(false, 1);
  }, [selectedDate, viewMode, journalLimit]);

  useEffect(() => {
    if (viewMode === 'journal' && !isMobile) {
      fetchJournal(false, journalPage);
    }
  }, [journalPage]);

  // Infinite scroll for mobile
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (
            viewMode === 'journal' &&
            !isFetchingMoreJournal &&
            !journalLoading &&
            journalPage < journalTotalPages
          ) {
            fetchJournal(true);
          } else if (
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

    if (viewMode === 'journal' && observerTarget.current) {
      observer.observe(observerTarget.current);
    } else if (viewMode === 'pos' && recentTxnsObserverTarget.current) {
      observer.observe(recentTxnsObserverTarget.current);
    }

    return () => observer.disconnect();
  }, [
    isMobile,
    viewMode,
    isFetchingMoreJournal,
    journalLoading,
    journalPage,
    journalTotalPages,
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
    setIsProcessing(true);
    try {
      await api.post(`/members/${member._id}/withdraw`, {
        amount: parseFloat(amount),
        notes: description || undefined,
        accountType,
        paymentMethod,
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
        paymentMethod: 'cash',
        notes: description || 'POS cash loan payment',
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
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  // ── Cash in Hand Functions ────────────────────
  const fetchCashSummary = async (dateOverride) => {
    setCashSummaryLoading(true);
    try {
      const targetDate = dateOverride || cashbookDate;
      const dateParam = format(targetDate, 'yyyy-MM-dd');
      const { data } = await api.get('/ledger/cash-summary', {
        params: { date: dateParam },
      });
      setCashSummary(data);
      if (data.hasOpening || data.isCarriedForward) {
        setCashOpeningInput(String(data.openingCash));
      } else {
        setCashOpeningInput('');
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
      await api.post('/ledger/cash-opening', { amount: amt });
      toast.success('Cash opening set successfully');
      fetchCashSummary();
      fetchCashTxns(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set cash opening');
    } finally {
      setIsSettingOpening(false);
    }
  };

  const handleSaveDenominations = async () => {
    setIsSavingDenoms(true);
    try {
      await api.post('/ledger/cash-denominations', {
        denominations: denomCounts,
      });
      toast.success('Denomination count saved');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to save denominations',
      );
    } finally {
      setIsSavingDenoms(false);
    }
  };

  // Fetch cash data when switching to cashbook tab or changing date
  useEffect(() => {
    if (viewMode === 'cashbook') {
      fetchCashSummary(cashbookDate);
      fetchCashTxns(1, cashbookDate);
    }
  }, [viewMode, cashTxnsLimit, cashbookDate]);

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
    const monthlyInterest =
      (tellerActiveLoan.principal * tellerActiveLoan.rate) / 1200;
    const dailyInterest = monthlyInterest / 30;
    const interestForDays = Math.round(dailyInterest * daysPassed);
    const principalPerInstallment = Math.round(
      tellerActiveLoan.principal / (tellerActiveLoan.duration || 1),
    );
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
    if (activeAction === 'deposit') handleDeposit();
    else if (activeAction === 'withdraw') handleWithdraw();
    else if (activeAction === 'loan-pay') handleLoanPayment();
  };

  const actionConfig = {
    deposit: {
      label: 'Cash Deposit',
      icon: ArrowDownCircle,
      color: 'emerald',
      bgClass: 'bg-emerald-500/10 border-emerald-500/20',
      activeClass: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
      btnClass:
        'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
      focusClass: 'focus:border-emerald-500 focus:ring-emerald-500',
    },
    withdraw: {
      label: 'Cash Withdrawal',
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-card/30 backdrop-blur-md border border-border/50 p-6 rounded-[2.5rem]">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/40 overflow-hidden">
              <Zap size={32} className="relative z-10" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-background rounded-full animate-pulse shadow-lg shadow-emerald-500/20" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
              Teller POS
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-[9px] font-black uppercase tracking-wider text-primary">
                <User size={8} />
                Session Active
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                <Clock size={8} />
                {new Date().toLocaleDateString('en-PK', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── View Switcher ────────────────────────── */}
        <div className="flex bg-muted/40 p-1.5 rounded-2xl w-full max-w-md shrink-0">
          <button
            onClick={() => setViewMode('pos')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'pos'
                ? 'bg-card text-primary shadow-lg shadow-black/5'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Zap size={12} />
            Quick POS
          </button>
          <button
            onClick={() => setViewMode('journal')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'journal'
                ? 'bg-card text-primary shadow-lg shadow-black/5'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <FileText size={12} />
            Journal
          </button>
          <button
            onClick={() => setViewMode('cashbook')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'cashbook'
                ? 'bg-card text-emerald-600 shadow-lg shadow-black/5'
                : 'text-muted-foreground hover:bg-muted'
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
            <div className="p-6 rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.02] backdrop-blur-xl relative z-10 group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-focus-within:opacity-30 transition-opacity">
                <Search size={40} className="text-primary" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 px-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Member Search
              </h3>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors"
                />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Name, CNIC, Phone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-muted/30 border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium placeholder:text-muted-foreground/30"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* keyboard indicator */}
              <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-muted/50 font-sans">
                    ESC
                  </kbd>{' '}
                  to clear
                </span>
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-3 p-2 bg-card/95 border border-border/50 rounded-[2rem] shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
                  >
                    <div className="max-h-[300px] overflow-y-auto space-y-1 custom-scrollbar">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => selectMember(result.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:bg-primary/5 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black group-hover:bg-primary group-hover:text-white transition-colors">
                            {result.title?.charAt(0)?.toUpperCase() || '?'}
                          </div>
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
                <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-card/95 border border-border/50 rounded-[2rem] shadow-2xl backdrop-blur-2xl z-50">
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
                  <div className="p-6 rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.02]">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt={member.name}
                              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/10 shadow-lg"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                              {member.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-card rounded-full" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black tracking-tight capitalize leading-tight">
                            {member.name}
                          </h2>
                          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mt-1">
                            {member.currentAccountNumber}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearMember}
                        className="p-2 rounded-xl text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                        title="Clear Member"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          label: 'Current Account',
                          value: member.currentBalance,
                          icon: Wallet,
                          color: 'emerald',
                        },
                        {
                          label: 'Saving Account',
                          value: member.savingBalance,
                          icon: CreditCard,
                          color: 'primary',
                        },
                        {
                          label: 'Business Share',
                          value: member.shareBalance,
                          icon: Banknote,
                          color: 'amber',
                        },
                      ].map((card, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/30 group hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${card.color}-500/10 text-${card.color}-500 shadow-sm`}
                            >
                              <card.icon size={16} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                              {card.label}
                            </span>
                          </div>
                          <p className="text-sm font-black tracking-tight">
                            {formatCurrency(card.value || 0)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {activeLoans.length > 0 && (
                      <div className="mt-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-sm">
                            <RefreshCw size={16} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">
                            Active Loans
                          </span>
                        </div>
                        <span className="text-sm font-black text-indigo-600">
                          {activeLoans.length}
                        </span>
                      </div>
                    )}

                    {/* Guarantors Section */}
                    {member.guarantors?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <ShieldCheck size={12} className="text-blue-500" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/70">
                            Guarantors ({member.guarantors.length})
                          </span>
                        </div>
                        {member.guarantors.map((g) => (
                          <div
                            key={g._id}
                            className="flex items-center justify-between p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer group"
                            onClick={() => selectMember(g._id)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-[10px] shrink-0">
                                {(g.name || '?')[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-black capitalize truncate group-hover:text-blue-600 transition-colors">
                                  {g.name || 'Unknown'}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground/60 truncate">
                                  {formatCNIC?.(g.cnic) || g.cnic || 'No CNIC'}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                              g.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : g.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-600'
                                  : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {g.status || 'pending'}
                            </span>
                          </div>
                        ))}
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
                        {member.actingAsGrantor.map((g) => (
                          <div
                            key={g.loanId}
                            className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 font-black text-[10px] shrink-0">
                                {(g.customerName || '?')[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-black capitalize truncate">
                                  {g.customerName}
                                </div>
                                <div className="text-[10px] text-muted-foreground/60">
                                  {formatCurrency(g.loanAmount)}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                              g.loanStatus === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : g.loanStatus === 'completed'
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-red-500/10 text-red-600'
                            }`}>
                              {g.loanStatus}
                            </span>
                          </div>
                        ))}
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
                  className="p-10 rounded-[2.5rem] bg-card/30 border border-dashed border-border/50 flex flex-col items-center justify-center text-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                    <User size={24} className="text-primary/20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 leading-relaxed">
                    Search above to start
                  </p>
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
                    label: 'Today Cash In',
                    value: sessionStats.cashIn,
                    color: 'emerald',
                    icon: ArrowDownCircle,
                  },
                  {
                    label: 'Today Cash Out',
                    value: sessionStats.cashOut,
                    color: 'rose',
                    icon: ArrowUpCircle,
                  },
                  {
                    label: 'Net Position',
                    value: sessionStats.net,
                    color: 'indigo',
                    icon: Wallet,
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
                          className={`group p-5 rounded-[2rem] border-2 transition-all duration-500 flex items-center gap-4 relative overflow-hidden ${
                            isActive
                              ? `${config.activeClass} border-transparent`
                              : `${config.bgClass} border-border/50 hover:border-primary/20 hover:bg-card`
                          }`}
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                              isActive
                                ? 'bg-white/20'
                                : `bg-${config.color}-500/10 text-${config.color}-500 group-hover:scale-110`
                            }`}
                          >
                            <Icon size={24} />
                          </div>
                          <div className="text-left">
                            <p
                              className={`text-xs font-black uppercase tracking-widest ${
                                isActive ? 'text-white' : ''
                              }`}
                            >
                              {config.label}
                            </p>
                            <p
                              className={`text-[9px] font-bold mt-1 max-w-[120px] transition-colors ${
                                isActive
                                  ? 'text-white/60'
                                  : 'text-muted-foreground/50'
                              }`}
                            >
                              {key === 'deposit'
                                ? 'Process Credit'
                                : key === 'withdraw'
                                  ? 'Process Debit'
                                  : 'Loan Repay'}
                            </p>
                          </div>
                          {isActive && (
                            <motion.div
                              layoutId="active-bg"
                              className="absolute inset-0 z-[-1]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Form */}
                  <AnimatePresence>
                    {activeAction && (
                      <motion.form
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        onSubmit={submitAction}
                        className="p-8 rounded-[3rem] bg-card border-2 border-primary/20 shadow-2xl shadow-primary/5 space-y-8 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${actionConfig[activeAction].activeClass} shadow-lg shadow-black/5`}
                            >
                              {(() => {
                                const Icon = actionConfig[activeAction].icon;
                                return <Icon size={24} />;
                              })()}
                            </div>
                            <div>
                              <h3 className="text-xl font-black tracking-tight">
                                {actionConfig[activeAction].label}
                              </h3>
                              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                                Complete fields to process
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveAction(null)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground/30 hover:text-muted-foreground transition-all"
                          >
                            <X size={20} />
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
                            {activeAction !== 'loan-pay' && (
                              <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                                  Payment Method
                                </label>
                                <div className="flex gap-2 p-1.5 bg-muted/40 rounded-[1.5rem] border border-border/50">
                                  <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      paymentMethod === 'cash'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                  >
                                    <HandCoins size={14} />
                                    Cash
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentMethod('online')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      paymentMethod === 'online'
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                  >
                                    <Globe size={14} />
                                    Online
                                  </button>
                                </div>
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
                  <div className="p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.01]">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                          <Clock size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest">
                            Recent Transactions
                          </h3>
                          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">
                            Latest activity for this member
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportMemberPDF}
                        isLoading={isExportingMemberPdf}
                        disabled={recentTxns.length === 0}
                        className="rounded-[1rem] gap-2 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-primary hover:text-white transition-all h-9 px-4"
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
                            (txn.category || '').includes('deposit');
                          return (
                            <motion.div
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              key={txn._id || i}
                              className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-border/10 hover:bg-muted/20 transition-all group"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                                    isIn
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : 'bg-rose-500/10 text-rose-500'
                                  }`}
                                >
                                  {isIn ? (
                                    <ArrowDownCircle size={18} />
                                  ) : (
                                    <ArrowUpCircle size={18} />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-black capitalize group-hover:text-primary transition-colors">
                                    {txn.description ||
                                      txn.category?.replace('_', ' ') ||
                                      'Transaction'}
                                  </p>
                                  {txn.notes && (
                                    <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5 truncate max-w-[180px] italic">
                                      {txn.notes}
                                    </p>
                                  )}
                                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-1">
                                    {format(
                                      new Date(txn.date || txn.createdAt),
                                      'MMM d, yyyy • p',
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p
                                    className={`text-sm font-black ${
                                      isIn
                                        ? 'text-emerald-500'
                                        : 'text-rose-500'
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
                  className="h-[600px] rounded-[3rem] border-2 border-dashed border-border/50 bg-muted/5 flex flex-col items-center justify-center text-center p-12 overflow-hidden relative"
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
                    <div className="p-4 rounded-2xl bg-card border border-border/50 text-left">
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
                    <div className="p-4 rounded-2xl bg-card border border-border/50 text-left">
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

      {/* ── Journal View ─────────────────────────── */}
      {viewMode === 'journal' && (
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
                className="rounded-[1rem] gap-2 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-primary hover:text-white transition-all h-10 px-4 whitespace-nowrap w-full sm:w-auto mt-2 sm:mt-0"
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
                              (txn.category || '').includes('deposit');

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
                              (txn.category || '').includes('deposit');

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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-[2.5rem] bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Calendar size={18} />
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Cash in Hand
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCashbookDate((prev) => addDays(prev, -1))}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                title="Previous Day"
              >
                <ChevronLeft size={18} />
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
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Day"
              >
                <ChevronRight size={18} />
              </button>
              {!isCashbookToday && (
                <button
                  onClick={() => setCashbookDate(new Date())}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Cash Opening Card */}
          <div className="p-6 sm:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.02]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <HandCoins size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight">
                      {isCashbookToday
                        ? 'Cash in Hand'
                        : 'Cash in Hand (Historical)'}
                    </h3>
                    {cashSummary.isCarriedForward && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-600 animate-in fade-in duration-300">
                        Carried Forward
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
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
                      onClick={handleSetCashOpening}
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
                  className="h-12 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/25 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                >
                  <Banknote size={20} />
                  Count Cash Counter
                  {denomTotal > 0 && (
                    <span className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {[
                {
                  label: 'Opening Cash',
                  value: cashSummary.openingCash,
                  color: 'amber',
                  icon: Wallet,
                },
                {
                  label: 'Cash In',
                  value: cashSummary.cashIn,
                  color: 'emerald',
                  icon: ArrowDownCircle,
                },
                {
                  label: 'Cash Out',
                  value: cashSummary.cashOut,
                  color: 'rose',
                  icon: ArrowUpCircle,
                },
                {
                  label: 'Closing Cash',
                  value: cashSummary.closingCash,
                  color: 'indigo',
                  icon: HandCoins,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.02] relative overflow-hidden"
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
                  <p
                    className={`text-xl sm:text-2xl font-black tracking-tighter ${
                      stat.label === 'Closing Cash'
                        ? stat.value >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                        : ''
                    }`}
                  >
                    {formatCurrency(stat.value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Cash Transactions Log */}
          <div className="py-4 px-1 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] md:bg-card md:border md:border-border/50 md:shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Banknote size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    {isCashbookToday
                      ? "Today's"
                      : format(cashbookDate, 'MMM d')}{' '}
                    Cash Transactions
                  </h3>
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">
                    {cashTxnsTotalEntries} cash transaction
                    {cashTxnsTotalEntries !== 1 ? 's' : ''}
                    {isCashbookToday ? ' today' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCashbookPDF}
                  isLoading={isExportingCashbook}
                  disabled={cashTxns.length === 0}
                  className="rounded-[1rem] gap-2 text-[10px] font-black uppercase tracking-widest border-border/50 hover:bg-primary hover:text-white transition-all h-9 px-4"
                >
                  <Download size={14} />
                  PDF
                </Button>
                <button
                  onClick={() => {
                    fetchCashSummary(cashbookDate);
                    fetchCashTxns(cashTxnsPage, cashbookDate);
                  }}
                  className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground/50 hover:text-primary transition-all"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {cashTxnsLoading ? (
              <TellerJournalSkeleton />
            ) : cashTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4 border-2 border-dashed border-border/50 rounded-[2rem]">
                <HandCoins size={40} className="text-muted-foreground/20" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest">
                    No Cash Transactions Yet
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
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
                      <tr className="border-b border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-left">
                        <th className="pb-4 pt-2 px-2">Date & Time</th>
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
                          (txn.category || '').includes('deposit');
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
                                      {txn.member.name?.charAt(0).toUpperCase()}
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
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-1">
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
    </div>
  );
};

export default TellerMode;
