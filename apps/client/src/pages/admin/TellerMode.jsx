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
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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
import { formatCurrency } from '@/lib/utils';

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
  const [viewMode, setViewMode] = useState('pos'); // 'pos' | 'journal'
  const [selectedDate, setSelectedDate] = useState({
    from: new Date(),
    to: new Date(),
  });
  const [journalTxns, setJournalTxns] = useState([]);
  const [journalLoading, setJournalLoading] = useState(false);
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
  const isMobile = useIsMobile();
  const observerTarget = useRef(null);
  const recentTxnsObserverTarget = useRef(null);
  const skipNextEffect = useRef(false);

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
      const startDate = getISODate(selectedDate?.from || new Date());
      const endDate = getISODate(
        selectedDate?.to || selectedDate?.from || new Date(),
      );

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
        description: description || `POS cash deposit`,
        accountType,
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
        description: description || `POS cash withdrawal`,
        accountType,
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
    // Focus search for next customer
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
    setTimeout(() => searchRef.current?.focus(), 100);
  };

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
        <div className="flex bg-muted/40 p-1.5 rounded-2xl w-full max-w-xs shrink-0">
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
        </div>
      </div>

      {/* ── POS View ─────────────────────────────── */}
      {viewMode === 'pos' && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── Left Column: Member Search & Info (4 cols) ── */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            <div className="p-6 rounded-[2.5rem] bg-card border border-border/50 shadow-xl shadow-black/[0.02] backdrop-blur-xl relative group">
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
                                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-1">
                                    {format(
                                      new Date(txn.date || txn.createdAt),
                                      'MMM d, yyyy • p',
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-sm font-black ${
                                    isIn ? 'text-emerald-500' : 'text-rose-500'
                                  }`}
                                >
                                  {isIn ? '+' : '-'}
                                  {formatCurrency(txn.amount)}
                                </p>
                                <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mt-0.5">
                                  Completed
                                </p>
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

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2 hidden sm:block">
                Select Date:
              </span>
              <DateRangePicker
                date={selectedDate}
                setDate={setSelectedDate}
                disabled={!isAdmin}
                className="w-[300px]"
              />
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
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {journalTxns.map((txn, i) => {
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
                                  {txn.description || txn.notes || '—'}
                                </p>
                              </td>
                              <td className="py-5 px-2 text-right">
                                <p
                                  className={`text-sm font-black ${isIn ? 'text-emerald-500' : 'text-rose-500'}`}
                                >
                                  {isIn ? '+' : '-'}
                                  {formatCurrency(txn.amount)}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
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

      {/* ── POS Specific Views (Retired in Sidebar) ───────────────────── */}
      {/* Handled in the split-layout above */}
    </div>
  );
};

export default TellerMode;
