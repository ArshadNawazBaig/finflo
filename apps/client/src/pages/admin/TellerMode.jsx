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
      fetchRecentTxns(memberId);
    } catch (err) {
      toast.error('Failed to load member details');
      setMember(null);
    } finally {
      setMemberLoading(false);
    }
  };

  const fetchRecentTxns = async (memberId) => {
    try {
      const { data } = await api.get('/ledger/transactions', {
        params: {
          member: memberId,
          limit: 10,
          sortBy: 'date',
          sortOrder: 'desc',
        },
      });
      setRecentTxns(data?.data || data || []);
    } catch {
      setRecentTxns([]);
    }
  };

  const fetchSessionStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get('/ledger', {
        params: { startDate: today, endDate: today, limit: 200 },
      });
      const txns = data?.data || data || [];
      const stats = txns.reduce(
        (acc, txn) => {
          const type = (txn.type || '').toLowerCase();
          const category = (txn.category || '').toLowerCase();
          const amt = parseFloat(txn.amount) || 0;

          if (
            type === 'income' ||
            category === 'repayment' ||
            category === 'investment' ||
            category === 'saving_deposit'
          ) {
            acc.cashIn += amt;
          } else if (
            type === 'expense' ||
            type === 'loan' ||
            category === 'withdrawal' ||
            category === 'saving_withdrawal'
          ) {
            acc.cashOut += amt;
          }
          return acc;
        },
        { cashIn: 0, cashOut: 0 },
      );
      setSessionStats({ ...stats, net: stats.cashIn - stats.cashOut });
    } catch {
      // Ignore
    }
  };

  const getISODate = (date) =>
    date instanceof Date
      ? date.toISOString().split('T')[0]
      : date?.toISOString
        ? date.toISOString().split('T')[0]
        : date;

  const fetchJournal = async (isAppend = false, pageOverride) => {
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
          limit: journalLimit,
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
      } else {
        // Fallback to local calculation if summary not provided (less accurate if paginated)
        const stats = txns.reduce(
          (acc, txn) => {
            const type = (txn.type || '').toLowerCase();
            const category = (txn.category || '').toLowerCase();
            const amt = parseFloat(txn.amount) || 0;

            if (
              type === 'income' ||
              category === 'repayment' ||
              category === 'investment' ||
              category === 'saving_deposit'
            ) {
              acc.cashIn += amt;
            } else if (
              type === 'expense' ||
              type === 'loan' ||
              category === 'withdrawal' ||
              category === 'saving_withdrawal'
            ) {
              acc.cashOut += amt;
            }
            return acc;
          },
          { cashIn: 0, cashOut: 0 },
        );
        setJournalStats({ ...stats, net: stats.cashIn - stats.cashOut });
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
    if (!isMobile || viewMode !== 'journal') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMoreJournal &&
          !journalLoading &&
          journalPage < journalTotalPages
        ) {
          fetchJournal(true);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [
    isMobile,
    viewMode,
    isFetchingMoreJournal,
    journalLoading,
    journalPage,
    journalTotalPages,
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
    <div className="flex flex-col items-center space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      {/* ── Header ──────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-primary via-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/40 overflow-hidden">
            <Zap size={40} className="relative z-10" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 border-4 border-background rounded-full animate-pulse shadow-lg shadow-emerald-500/20" />
        </div>
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Teller POS
          </h1>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black uppercase tracking-wider text-primary">
              <User size={10} />
              Session Active
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-[10px] font-black uppercase tracking-wider text-indigo-500">
              <Clock size={10} />
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
      <div className="flex bg-muted/30 p-1 rounded-2xl w-full max-w-sm">
        <button
          onClick={() => setViewMode('pos')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            viewMode === 'pos'
              ? 'bg-card text-primary shadow-sm shadow-primary/10'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Zap size={14} />
          New Transaction
        </button>
        <button
          onClick={() => setViewMode('journal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            viewMode === 'journal'
              ? 'bg-card text-primary shadow-sm shadow-primary/10'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <FileText size={14} />
          Daily Journal
        </button>
      </div>

      {/* ── POS View ─────────────────────────────── */}
      {viewMode === 'pos' && (
        <>
          {/* Session Summary Stats */}

          {/* ── Session Summary Stats ────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl">
            {[
              {
                label: 'Today Cash In',
                value: sessionStats.cashIn,
                color: 'text-emerald-500',
                bg: 'bg-emerald-500/5',
                icon: ArrowDownCircle,
              },
              {
                label: 'Today Cash Out',
                value: sessionStats.cashOut,
                color: 'text-rose-500',
                bg: 'bg-rose-500/5',
                icon: ArrowUpCircle,
              },
              {
                label: 'Net Session',
                value: sessionStats.net,
                color: 'text-primary',
                bg: 'bg-primary/5',
                icon: Wallet,
              },
            ].map((stat, i) => (
              <div
                key={i}
                className={`p-4 rounded-[2rem] ${stat.bg} border border-border/20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-700 delay-${i * 100}`}
              >
                <stat.icon size={16} className={`${stat.color} mb-1.5`} />
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-1">
                  {stat.label}
                </p>
                <p
                  className={`text-sm font-black tracking-tighter ${stat.color}`}
                >
                  {formatCurrency(stat.value)}
                </p>
              </div>
            ))}
          </div>

          {/* ── Search Bar ──────────────────────────── */}
          <div className="relative w-full max-w-2xl">
            <div className="relative group">
              <Search
                size={20}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
              />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search member by name, phone, CNIC, or account number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full pl-14 pr-14 py-5 rounded-[2rem] bg-card border-2 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium shadow-sm placeholder:text-muted-foreground/50"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border/50 rounded-[2rem] shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 max-h-[300px] overflow-y-auto space-y-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => selectMember(result.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg group-hover:bg-primary group-hover:text-white transition-colors">
                        {result.title?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black capitalize truncate group-hover:text-primary transition-colors">
                          {result.title}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {result.subtitle}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isSearching && (
              <div className="absolute top-full mt-2 w-full bg-card border border-border/50 rounded-[2rem] shadow-2xl z-50 overflow-hidden">
                <TellerSearchSkeleton />
              </div>
            )}
          </div>
        </>
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
              {!isAdmin && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-[9px] font-black uppercase tracking-widest text-amber-600">
                  <AlertTriangle size={12} />
                  Staff (Today Only)
                </div>
              )}
            </div>
          </div>

          {/* Journal Results */}
          <div className="py-4 px-1 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] md:bg-card md:border md:border-border/50 md:shadow-sm space-y-8">
            {/* Journal Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              {[
                {
                  label: 'Journal Cash In',
                  value: journalStats.cashIn,
                  color: 'text-emerald-500',
                },
                {
                  label: 'Journal Cash Out',
                  value: journalStats.cashOut,
                  color: 'text-rose-500',
                },
                {
                  label: 'Net Journal',
                  value: journalStats.net,
                  color: 'text-primary',
                },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground/50 mb-1">
                    {stat.label}
                  </p>
                  <p
                    className={`text-sm sm:text-2xl font-black tracking-tighter ${stat.color}`}
                  >
                    {formatCurrency(stat.value)}
                  </p>
                </div>
              ))}
            </div>

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

      {/* ── POS Specific Views ───────────────────── */}
      {viewMode === 'pos' && (
        <div className="w-full">
          {memberLoading ? (
            <TellerMemberCardSkeleton />
          ) : (
            <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Member Card + Actions */}
              {member && (
                <div className="space-y-8">
                  {/* Member Info Card */}
                  <div className="p-6 sm:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt={member.name}
                              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/30">
                              {member.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-card rounded-full" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black tracking-tight capitalize">
                            {member.name}
                          </h2>
                          <p className="text-xs font-bold text-muted-foreground">
                            {member.cnic} • {member.phone}
                          </p>
                          <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                            {member.currentAccountNumber}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={clearMember}
                        className="px-5 py-2.5 rounded-full border border-border/50 text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <X size={14} className="inline mr-1.5" />
                        Clear
                      </button>
                    </div>

                    {/* Balance Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                      {[
                        {
                          label: 'Current Account',
                          value: member.currentBalance,
                          icon: Wallet,
                          color: 'text-primary',
                          bg: 'bg-primary/5',
                        },
                        {
                          label: 'Saving Account',
                          value: member.savingBalance,
                          icon: CreditCard,
                          color: 'text-emerald-500',
                          bg: 'bg-emerald-500/5',
                        },
                        {
                          label: 'Business Share',
                          value: member.shareBalance,
                          icon: Banknote,
                          color: 'text-amber-500',
                          bg: 'bg-amber-500/5',
                        },
                        {
                          label: 'Active Loans',
                          value: activeLoans.length,
                          icon: ArrowRight,
                          color: 'text-indigo-500',
                          bg: 'bg-indigo-500/5',
                          isCurrency: false,
                        },
                      ].map((card, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-2xl ${card.bg} border border-border/20`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <card.icon size={14} className={card.color} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                              {card.label}
                            </span>
                          </div>
                          <p
                            className={`text-lg font-black tracking-tight ${card.color}`}
                          >
                            {card.isCurrency === false
                              ? card.value
                              : formatCurrency(card.value || 0)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
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
                          className={`p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-center gap-4 group ${
                            isActive ? config.activeClass : config.bgClass
                          }`}
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                              isActive
                                ? 'bg-white/20'
                                : `bg-${config.color}-500/10`
                            }`}
                          >
                            <Icon
                              size={24}
                              className={
                                isActive
                                  ? 'text-white'
                                  : `text-${config.color}-500`
                              }
                            />
                          </div>
                          <div className="text-left">
                            <p
                              className={`text-sm font-black uppercase tracking-widest ${
                                isActive ? 'text-white' : ''
                              }`}
                            >
                              {config.label}
                            </p>
                            <p
                              className={`text-[10px] font-medium mt-0.5 ${
                                isActive
                                  ? 'text-white/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {key === 'deposit'
                                ? 'Add funds to account'
                                : key === 'withdraw'
                                  ? 'Remove funds from account'
                                  : 'Record a loan repayment'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Action Form */}
                  {activeAction && (
                    <form
                      onSubmit={submitAction}
                      className="p-6 sm:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const Icon = actionConfig[activeAction].icon;
                            return (
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${actionConfig[activeAction].activeClass}`}
                              >
                                <Icon size={20} />
                              </div>
                            );
                          })()}
                          <h3 className="text-lg font-black tracking-tight">
                            {actionConfig[activeAction].label}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveAction(null)}
                          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Account Type Selector (for deposit/withdraw) */}
                      {activeAction !== 'loan-pay' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Account
                          </label>
                          <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl">
                            {['current', 'saving'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setAccountType(type)}
                                className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  accountType === type
                                    ? `${actionConfig[activeAction].activeClass}`
                                    : 'text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {type} Account
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Loan Selector (for loan-pay) */}
                      {activeAction === 'loan-pay' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Select Loan
                          </label>
                          {activeLoans.length === 0 ? (
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                              <AlertTriangle
                                size={16}
                                className="text-amber-500"
                              />
                              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                No active loans found for this member.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {activeLoans.map((loan) => (
                                <button
                                  key={loan._id}
                                  type="button"
                                  onClick={() => setSelectedLoan(loan)}
                                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                                    selectedLoan?._id === loan._id
                                      ? 'border-indigo-500 bg-indigo-500/5'
                                      : 'border-border/30'
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-black">
                                      {formatCurrency(loan.principal)}
                                      <span className="text-muted-foreground font-medium">
                                        {' '}
                                        • {loan.duration}mo
                                      </span>
                                    </p>
                                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                                      Remaining:{' '}
                                      {formatCurrency(loan.remainingAmount)} •
                                      EMI: {formatCurrency(loan.emi)}
                                    </p>
                                  </div>
                                  {selectedLoan?._id === loan._id && (
                                    <CheckCircle2
                                      size={20}
                                      className="text-indigo-500"
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Amount Input */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-muted-foreground/50">
                            Rs.
                          </span>
                          <input
                            ref={amountRef}
                            type="number"
                            min="1"
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className={`w-full pl-14 pr-6 py-5 rounded-2xl bg-muted/20 border-2 border-border/30 ${actionConfig[activeAction].focusClass} focus:ring-2 transition-all text-2xl font-black tracking-tight`}
                          />
                        </div>
                        {/* Quick amount buttons */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[500, 1000, 2000, 5000, 10000, 50000].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAmount(String(val))}
                              className="px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors border border-border/30"
                            >
                              {formatCurrency(val)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Notes{' '}
                          <span className="text-muted-foreground/40">
                            (optional)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. Monthly installment, Cash deposit"
                          className="w-full px-5 py-3.5 rounded-2xl bg-muted/20 border border-border/30 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-sm font-medium"
                        />
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
                        className={`w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest ${actionConfig[activeAction].btnClass} disabled:opacity-40`}
                      >
                        {!isProcessing && (
                          <>
                            {(() => {
                              const Icon = actionConfig[activeAction].icon;
                              return <Icon size={18} className="mr-2" />;
                            })()}
                            Process {actionConfig[activeAction].label}
                            {amount
                              ? ` — ${formatCurrency(parseFloat(amount) || 0)}`
                              : ''}
                          </>
                        )}
                      </Button>
                    </form>
                  )}

                  {/* Recent Activity */}
                  {recentTxns.length > 0 && (
                    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-card border border-border/50 shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                          <Clock size={18} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest">
                          Recent Transactions
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {recentTxns.map((txn, i) => {
                          const isIn =
                            txn.type === 'income' ||
                            (txn.category || '').includes('repayment') ||
                            (txn.category || '').includes('deposit');
                          return (
                            <div
                              key={txn._id || i}
                              className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
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
                                <div>
                                  <p className="text-sm font-bold capitalize">
                                    {txn.description ||
                                      txn.category?.replace('_', ' ') ||
                                      'Transaction'}
                                  </p>
                                  <p className="text-[10px] font-medium text-muted-foreground">
                                    {new Date(
                                      txn.date || txn.createdAt,
                                    ).toLocaleDateString('en-PK', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <p
                                className={`text-sm font-black ${
                                  isIn ? 'text-emerald-500' : 'text-rose-500'
                                }`}
                              >
                                {isIn ? '+' : '-'}
                                {formatCurrency(txn.amount)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State (POS Only) */}
              {!member && (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700">
                  <div className="w-24 h-24 rounded-full bg-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center mb-6">
                    <User size={40} className="text-primary/30" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2">
                    Search for a Member
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md font-medium">
                    Start typing a member's name, phone number, CNIC, or account
                    number to quickly process deposits, withdrawals, or loan
                    payments.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TellerMode;
