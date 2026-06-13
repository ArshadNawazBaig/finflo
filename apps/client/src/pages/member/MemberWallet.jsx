import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  QrCode,
  Send,
  CreditCard,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Activity,
  RefreshCw,
  BadgeDollarSign,
  Download,
  Loader2,
} from 'lucide-react';
import { exportAccountStatement } from '@/lib/pdfExportUtils';
import SensitiveData, { SensitiveBalance } from '@/components/ui/SensitiveData';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import MemberActivityCard from '@/components/member/MemberActivityCard';
import { cn, formatCurrency } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MemberDepositModal from '@/components/member/MemberDepositModal';
import MemberQRCode from '@/components/member/MemberQRCode';
import MemberScheduledPayments from '@/components/member/MemberScheduledPayments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link, useNavigate } from 'react-router-dom';
import { MemberWalletSkeleton, MemberInvestmentSkeleton } from '@/components/ui/PageSkeletons';

const MemberWallet = () => {
  const [member, setMember] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  // Pagination / infinite load state
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);

  const isMobile = useMediaQuery('(max-width: 1024px)');
  const navigate = useNavigate();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState('current');
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);

  const observerTarget = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchWalletData = useCallback(
    async (pageToFetch = 1, isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const [txRes, memberRes] = await Promise.all([
          api.get(
            `/members/portal/activity?page=${pageToFetch}&limit=${limit}&category=investment`,
            {
              headers: {
                /* Auth handled by cookies */
              },
            },
          ),
          api.get('/member-auth/me', {
            headers: {
              /* Auth handled by cookies */
            },
          }),
        ]);

        const newData = txRes.data.data || [];

        // Filter out business shares or loans if needed; backend usually handles with `category=investment` for deposits/withdrawals/transfers.
        // We will just show all "investment" category here (which maps to wallet activities).

        if (isAppend) {
          setTransactions((prev) => {
            const existingIds = new Set(prev.map((i) => i._id));
            return [...prev, ...newData.filter((i) => !existingIds.has(i._id))];
          });
        } else {
          setTransactions(newData);
        }

        setMember(memberRes.data);
        setTotalPages(txRes.data.totalPages || 0);
        setTotalEntries(txRes.data.totalEntries || 0);
        setCurrentPage(pageToFetch);
      } catch (error) {
        console.error('Failed to fetch wallet:', error);
        toast.error('Failed to load wallet data');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchWalletData(1, false);
    }
  }, [fetchWalletData]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchWalletData(currentPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isFetchingMore, currentPage, totalPages, fetchWalletData]);

  const handleDownloadStatement = async () => {
    if (activeAccount === 'loan') return;
    try {
      setIsDownloadingStatement(true);
      const { data } = await api.get('/members/portal/account-statement', {
        params: { accountType: activeAccount },
      });
      await exportAccountStatement(data, member);
      toast.success('Statement downloaded');
    } catch (error) {
      console.error('Statement download error:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to download statement',
      );
    } finally {
      setIsDownloadingStatement(false);
    }
  };

  if (loading && !member) {
    return <MemberWalletSkeleton />;
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <PageHeader
        title={
          <>
            My <span className="text-primary">Wallet</span>
          </>
        }
        description={`Manage your available ${member?.user?.businessName || 'FinFlo'} balance, deposit funds, or transfer money.`}
      />

      <>
          {/* Dashboard Metrics Header */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Main Account Area */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Account Tabs — flat pill row */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-50/40 dark:bg-white/[0.02] p-1 rounded-full w-fit border border-slate-100 dark:border-white/[0.06]">
                <button
                  onClick={() => setActiveAccount('current')}
                  className={cn(
                    'px-4 sm:px-5 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em] transition-all',
                    activeAccount === 'current'
                      ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )}
                >
                  Current
                </button>
                <button
                  onClick={() => setActiveAccount('saving')}
                  className={cn(
                    'px-4 sm:px-5 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em] transition-all',
                    activeAccount === 'saving'
                      ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )}
                >
                  Saving
                </button>
                <button
                  onClick={() => setActiveAccount('loan')}
                  className={cn(
                    'px-4 sm:px-5 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em] transition-all',
                    activeAccount === 'loan'
                      ? 'bg-primary text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.5)]'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
                  )}
                >
                  Loan
                </button>
              </div>

              {/* Wallet hero card — flat hero style */}
              <div className="relative p-6 sm:p-8 rounded-[2rem] flex flex-col justify-between flex-1 min-h-[320px] md:min-h-0 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] transition-all duration-500">
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      {activeAccount === 'current'
                        ? 'Current account'
                        : activeAccount === 'saving'
                          ? 'Saving account'
                          : member?.activeLoan
                            ? 'Outstanding balance'
                            : 'Available credit'}
                    </p>
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full [&_svg]:w-3.5 [&_svg]:h-3.5',
                        activeAccount === 'current'
                          ? 'bg-primary/10 text-primary'
                          : activeAccount === 'saving'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500',
                      )}
                    >
                      <CreditCard />
                    </div>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.035em] tabular-nums text-slate-900 dark:text-white leading-none">
                    <SensitiveBalance iconSize={18}>
                      {activeAccount === 'current'
                        ? formatCurrency(member?.currentBalance || 0)
                        : activeAccount === 'saving'
                          ? formatCurrency(member?.savingBalance || 0)
                          : member?.activeLoan
                            ? formatCurrency(
                                member.activeLoan.remainingAmount || 0,
                              )
                            : formatCurrency(member?.creditLimit || 0)}
                    </SensitiveBalance>
                  </h2>
                  {activeAccount === 'loan' && member?.activeLoan ? (
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        EMI {formatCurrency(member.activeLoan.emi || 0)}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                        Paid {formatCurrency(member.activeLoan.paidAmount || 0)} /{' '}
                        {formatCurrency(member.activeLoan.totalAmount || 0)}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full mt-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Account active
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mt-8">
                  <div className="flex-1 w-full sm:w-auto text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                      Account number
                    </p>
                    <p className="text-sm font-mono font-extrabold tabular-nums text-slate-700 dark:text-slate-200">
                      <SensitiveData maskLength={14} iconSize={14}>
                        {activeAccount === 'current'
                          ? member?.currentAccountNumber || 'CUR-C-XXXXX'
                          : activeAccount === 'saving'
                            ? member?.savingAccountNumber || 'SAV-S-XXXXX'
                            : member?.loanAccountNumber || 'LON-L-XXXXX'}
                      </SensitiveData>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    {activeAccount !== 'loan' && (
                      <Button
                        onClick={handleDownloadStatement}
                        disabled={isDownloadingStatement}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] px-5 py-3 h-auto rounded-full font-bold text-[11px] uppercase tracking-[0.12em] transition-all disabled:opacity-50"
                        title="Download last month's statement"
                      >
                        {isDownloadingStatement ? (
                          <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
                        ) : (
                          <Download size={14} strokeWidth={2.5} />
                        )}
                        Statement
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowQRModal(true)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] px-5 py-3 h-auto rounded-full font-bold text-[11px] uppercase tracking-[0.12em] transition-all"
                    >
                      <QrCode size={14} strokeWidth={2.5} /> My QR
                    </Button>
                    <Button
                      onClick={() => navigate('/member/transfer')}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[11px] uppercase tracking-[0.12em] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <Send size={14} strokeWidth={2.5} /> Transfer
                      <span className="ml-0.5 w-5 h-5 rounded-full bg-white text-primary flex items-center justify-center">
                        <ArrowUpRight size={11} strokeWidth={3} />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics — StatsCard style */}
            <div className="flex flex-col gap-4 h-full">
              <div className="flex-1 group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)] border border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Saving account
                  </p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10 text-teal-500 shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                    <BadgeDollarSign />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white leading-none mb-2">
                  <SensitiveBalance iconSize={14}>
                    {formatCurrency(member?.savingBalance || 0)}
                  </SensitiveBalance>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-0.5 font-bold text-teal-600 dark:text-teal-400">
                    <TrendingUp size={12} strokeWidth={3} />
                    Profit
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                    {formatCurrency(member?.totalSavingProfit || 0)}
                  </span>
                </div>
              </div>

              <div className="flex-1 group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)] border border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Total invested
                  </p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                    <TrendingUp />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white leading-none mb-2">
                  <SensitiveBalance iconSize={14}>
                    {formatCurrency(member?.totalInvested || 0)}
                  </SensitiveBalance>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <ArrowUp size={12} strokeWidth={3} />
                    Inflow
                  </span>
                </div>
              </div>

              <div className="flex-1 group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)] border border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Total withdrawn
                  </p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                    <Activity />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white leading-none mb-2">
                  <SensitiveBalance iconSize={14}>
                    {formatCurrency(member?.totalWithdrawn || 0)}
                  </SensitiveBalance>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="inline-flex items-center gap-0.5 font-bold text-rose-500 dark:text-rose-400">
                    <ArrowDown size={12} strokeWidth={3} />
                    Outflow
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Ledger */}
          <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden animate-in fade-in duration-700 delay-300">
            <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/[0.06] flex sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Activity
                </p>
                <h2 className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Wallet ledger
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Live transaction stream
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchWalletData(1, false)}
                  className={cn(
                    'h-9 w-9 rounded-full bg-slate-50 dark:bg-white/[0.04] text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-500',
                    loading && 'animate-spin cursor-not-allowed',
                  )}
                  disabled={loading}
                  title="Refresh Ledger"
                >
                  <RefreshCw size={14} strokeWidth={2.5} />
                </Button>
                <Link
                  to="/member/transactions"
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
                >
                  View all
                  <ArrowUpRight size={12} strokeWidth={2.5} />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading && !isFetchingMore ? (
                <MemberInvestmentSkeleton count={5} />
              ) : transactions.length === 0 ? (
                <div className="p-20">
                  <EmptyState
                    icon={History}
                    title="No Wallet History"
                    description="Your recent deposits, transfers, and withdrawals will appear here."
                  />
                </div>
              ) : (
                <div
                  className={cn('p-4 space-y-4', !isMobile && 'p-0 space-y-0')}
                >
                  <div
                    className={cn(
                      'grid grid-cols-1 gap-4',
                      !isMobile && 'divide-y divide-slate-100 dark:divide-white/[0.06] gap-0',
                    )}
                  >
                    {transactions.map((item) => {
                      const isCredit = isCreditType(item.type);
                      const typeLabel =
                        item.category === 'repayment'
                          ? 'Repayment'
                          : ({
                              deposit: 'Deposit',
                              withdrawal: 'Withdrawal',
                              transfer_send: 'Send',
                              transfer_receive: 'Receive',
                              external_send: 'Bank Out',
                              external_receive: 'Bank In',
                            }[item.type] ?? item.type);

                      if (isMobile) {
                        return (
                          <MemberActivityCard key={item._id} activity={item} />
                        );
                      }

                      return (
                        <div
                          key={item._id}
                          className="p-5 sm:p-6 hover:bg-slate-50/40 dark:hover:bg-white/[0.02] transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
                                isCredit
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-rose-500/10 text-rose-500',
                              )}
                            >
                              {isCredit ? <ArrowDownLeft /> : <ArrowUpRight />}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm tracking-[-0.02em] capitalize text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                                {item.description}
                                {item.status && (
                                  <span
                                    className={cn(
                                      'text-[9px] font-extrabold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full leading-none',
                                      item.status === 'Completed' &&
                                        'bg-emerald-500/10 text-emerald-600',
                                      item.status === 'Pending' &&
                                        'bg-amber-500/10 text-amber-600',
                                      item.status === 'Failed' &&
                                        'bg-rose-500/10 text-rose-600',
                                    )}
                                  >
                                    {item.status}
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span
                                  className={cn(
                                    'text-[10px] font-extrabold uppercase tracking-[0.12em]',
                                    isCredit
                                      ? 'text-emerald-600'
                                      : 'text-rose-600',
                                  )}
                                >
                                  {typeLabel}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/[0.12]" />
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                  {new Date(item.date).toLocaleDateString(
                                    undefined,
                                    {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    },
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col items-end gap-1">
                            <p
                              className={cn(
                                'text-base sm:text-lg font-extrabold tracking-tight tabular-nums',
                                isCredit
                                  ? 'text-emerald-600'
                                  : 'text-rose-600',
                              )}
                            >
                              {isCredit ? '+' : '-'}
                              {formatCurrency(item.amount)}
                            </p>
                            {item.balanceAfter !== undefined && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                                Bal {formatCurrency(item.balanceAfter)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isMobile && currentPage < totalPages && (
                <div ref={observerTarget} className="py-4 px-4">
                  <InfiniteLoader isFetchingMore={isFetchingMore} />
                </div>
              )}
            </div>

            {!isMobile && totalEntries > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages || 1}
                totalEntries={totalEntries}
                limit={limit}
                onPageChange={(page) => fetchWalletData(page, false)}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </>

      {/* Scheduled Payments */}
      <MemberScheduledPayments member={member} />

      {/* QR Code Dialog */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-center">My Payment QR</DialogTitle>
          </DialogHeader>
          <MemberQRCode member={member} />
        </DialogContent>
      </Dialog>

      <MemberDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={() => fetchWalletData(1, false)}
      />
    </div>
  );
};

export default MemberWallet;
