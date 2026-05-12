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
} from 'lucide-react';
import SensitiveData, { SensitiveBalance } from '@/components/ui/SensitiveData';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import MemberActivityCard from '@/components/member/MemberActivityCard';
import { cn, formatCurrency } from '@/lib/utils';
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
import { MemberWalletSkeleton } from '@/components/ui/PageSkeletons';

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
              {/* Account Tabs */}
              <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-[1.25rem] w-fit border border-border/50">
                <button
                  onClick={() => setActiveAccount('current')}
                  className={cn(
                    'px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all',
                    activeAccount === 'current'
                      ? 'bg-zinc-950 text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
                  )}
                >
                  Current
                </button>
                <button
                  onClick={() => setActiveAccount('saving')}
                  className={cn(
                    'px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all',
                    activeAccount === 'saving'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
                  )}
                >
                  Saving
                </button>
                <button
                  onClick={() => setActiveAccount('loan')}
                  className={cn(
                    'px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all',
                    activeAccount === 'loan'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5',
                  )}
                >
                  Loan
                </button>
              </div>

              {/* Credit Card Hero */}
              <div
                className={cn(
                  'relative text-white p-8 md:p-10 rounded-[3rem] shadow-2xl flex flex-col justify-between flex-1 min-h-[320px] md:min-h-0 group transition-all duration-500',
                  activeAccount === 'current'
                    ? 'bg-zinc-950 hover:shadow-zinc-500/20'
                    : activeAccount === 'saving'
                      ? 'bg-primary hover:shadow-primary/30'
                      : 'bg-amber-500 hover:shadow-amber-500/30',
                )}
              >
                {/* Card Hologram & Design */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                  <Wallet className="w-80 h-80 text-white" />
                </div>
                <div
                  className={cn(
                    'absolute -left-20 -bottom-20 w-64 h-64 blur-3xl rounded-full pointer-events-none transition-colors duration-500',
                    activeAccount === 'current'
                      ? 'bg-primary/30'
                      : activeAccount === 'saving'
                        ? 'bg-white/20'
                        : 'bg-white/20',
                  )}
                />
                <div className="absolute top-10 right-10 w-16 h-12 bg-white/10 rounded-xl border border-white/20 backdrop-blur-md flex items-center justify-center">
                  <div className="w-10 h-7 bg-white/20 rounded-md overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 left-1/4 right-1/4 border-x border-white/20" />
                    <div className="absolute left-0 right-0 top-1/4 bottom-1/4 border-y border-white/20" />
                  </div>
                </div>

                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md border border-white/20">
                      <CreditCard className="text-white w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">
                      {member?.user?.businessName || 'FinFlo'}{' '}
                      {activeAccount === 'loan' ? 'Credit' : 'Platinum'}
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 ml-1 hover:opacity-100 transition-opacity">
                    {activeAccount === 'current'
                      ? 'Current Account Balance'
                      : activeAccount === 'saving'
                        ? 'Saving Account Balance'
                        : member?.activeLoan
                          ? 'Outstanding Balance'
                          : 'Available Credit Limit'}
                  </p>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter drop-shadow-sm">
                    <SensitiveBalance
                      iconSize={20}
                      iconClassName="text-white/40 hover:text-white/80"
                    >
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
                    <div className="flex items-center gap-4 mt-4 ml-1">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                        EMI: {formatCurrency(member.activeLoan.emi || 0)}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-70">
                        Paid:{' '}
                        {formatCurrency(member.activeLoan.paidAmount || 0)} /{' '}
                        {formatCurrency(member.activeLoan.totalAmount || 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300 mt-4 ml-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Account Active
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 mt-8">
                  <div className="flex-1 w-full sm:w-auto text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                      Account Number
                    </p>
                    <p className="text-sm sm:text-base font-mono font-bold tracking-widest opacity-90 drop-shadow-md">
                      <SensitiveData
                        maskLength={14}
                        iconSize={14}
                        iconClassName="text-white/30 hover:text-white/70"
                      >
                        {activeAccount === 'current'
                          ? member?.currentAccountNumber || 'CUR-C-XXXXX'
                          : activeAccount === 'saving'
                            ? member?.savingAccountNumber || 'SAV-S-XXXXX'
                            : member?.loanAccountNumber || 'LON-L-XXXXX'}
                      </SensitiveData>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <div className="relative group flex-1 sm:flex-none">
                      <Button
                        onClick={() => setShowQRModal(true)}
                        className="w-full h-14 px-8 rounded-2xl bg-white/15 border border-white/10 hover:bg-white/25 text-white text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                      >
                        <QrCode size={18} /> My QR Code
                      </Button>
                    </div>
                    <Button
                      onClick={() => navigate('/member/transfer')}
                      className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                    >
                      <Send size={16} /> Transfer
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-col gap-6 h-full">
              <div className="flex-1 bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-teal-500/30 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                  <BadgeDollarSign className="w-20 h-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Saving Account
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-black tracking-tighter">
                    <SensitiveBalance iconSize={14}>
                      {formatCurrency(member?.savingBalance || 0)}
                    </SensitiveBalance>
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">
                    <TrendingUp size={10} /> Profit:{' '}
                    {formatCurrency(member?.totalSavingProfit || 0)}
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="w-20 h-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Total Invested
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-black tracking-tighter">
                    <SensitiveBalance iconSize={14}>
                      {formatCurrency(member?.totalInvested || 0)}
                    </SensitiveBalance>
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ArrowUp size={10} /> Inflow
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-card border border-border/50 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:border-rose-500/30 transition-all">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                  <Activity className="w-20 h-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  Total Withdrawn
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-lg font-black tracking-tighter">
                    <SensitiveBalance iconSize={14}>
                      {formatCurrency(member?.totalWithdrawn || 0)}
                    </SensitiveBalance>
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                    <ArrowDown size={10} /> Outflow
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Ledger */}
          <div className="bg-card rounded-[3rem] border border-border/50 shadow-sm overflow-hidden animate-in fade-in duration-700 delay-300">
            <div className="p-8 border-b border-border/50 flex sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10">
                  <Activity size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-md sm:text-xl font-black tracking-tight uppercase">
                    Wallet Ledger
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                    Live transaction stream
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fetchWalletData(1, false)}
                  className={cn(
                    'h-10 w-10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all active:rotate-180 duration-500',
                    loading && 'animate-spin cursor-not-allowed',
                  )}
                  disabled={loading}
                  title="Refresh Ledger"
                >
                  <RefreshCw size={18} />
                </Button>
                <Link
                  to="/member/transactions"
                  className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors hidden sm:block"
                >
                  View Full Ledger &rarr;
                </Link>
              </div>
            </div>

            <div className="divide-y divide-border/40">
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
                      !isMobile && 'divide-y divide-border/40 gap-0',
                    )}
                  >
                    {transactions.map((item) => {
                      const isCredit = [
                        'deposit',
                        'transfer_receive',
                        'external_receive',
                        'profit',
                      ].includes(item.type);
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
                          className="p-6 sm:p-8 hover:bg-muted/30 transition-all flex items-center justify-between group active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-6">
                            <div
                              className={cn(
                                'p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:scale-110 transition-transform',
                                isCredit
                                  ? 'text-emerald-500 bg-emerald-500/5'
                                  : 'text-rose-500 bg-rose-500/5',
                              )}
                            >
                              {isCredit ? (
                                <ArrowDownLeft size={20} />
                              ) : (
                                <ArrowUpRight size={20} />
                              )}
                            </div>
                            <div>
                              <h4 className="font-black text-lg tracking-tight capitalize group-hover:text-primary transition-colors flex items-center gap-2">
                                {item.description}
                                {item.status && (
                                  <div
                                    className={cn(
                                      'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1.5 border leading-none transition-all',
                                      item.status === 'Completed' &&
                                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                                      item.status === 'Pending' &&
                                        'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                      item.status === 'Failed' &&
                                        'bg-rose-500/10 text-rose-600 border-rose-500/20',
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        'w-1 h-1 rounded-full',
                                        item.status === 'Completed' &&
                                          'bg-emerald-500',
                                        item.status === 'Pending' &&
                                          'bg-amber-500 animate-pulse',
                                        item.status === 'Failed' &&
                                          'bg-rose-500',
                                      )}
                                    />
                                    {item.status}
                                  </div>
                                )}
                              </h4>
                              <div className="flex items-center gap-3 mt-1.5">
                                <div
                                  className={cn(
                                    'text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full',
                                    isCredit
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : 'bg-rose-500/10 text-rose-600',
                                  )}
                                >
                                  {typeLabel}
                                </div>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
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
                              className={`text-2xl font-black tracking-tighter ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {isCredit ? '+' : '-'}
                              {formatCurrency(item.amount)}
                            </p>
                            {item.balanceAfter !== undefined && (
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                  Balance
                                </span>
                                <span className="text-[10px] font-black tracking-tight text-foreground/80">
                                  {formatCurrency(item.balanceAfter)}
                                </span>
                              </div>
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
