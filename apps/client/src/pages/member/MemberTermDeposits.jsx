import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Lock,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  Clock,
  Percent,
  Wallet,
  Loader2,
  ArrowRight,
  Unlock,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import TransactionConfirmModal from '@/components/ui/TransactionConfirmModal';

const MemberTermDeposits = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [packages, setPackages] = useState([]);
  const [earlyBreakPenalty, setEarlyBreakPenalty] = useState(0);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [member, setMember] = useState(null);

  // Create dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [principal, setPrincipal] = useState('');
  const [sourceAccount, setSourceAccount] = useState('current');
  const [isCreating, setIsCreating] = useState(false);

  // Confirmation modal for create
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);

  // Break confirmation
  const [breakTarget, setBreakTarget] = useState(null);
  const [isBreaking, setIsBreaking] = useState(false);

  // Pagination
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(MOBILE_PAGE_LIMIT);
  const observerTarget = useRef(null);

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/term-deposits/portal/my-deposits');
      setDeposits(res.data || []);
    } catch (error) {
      console.error('Failed to fetch term deposits:', error);
      toast.error('Failed to load term deposits');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setPackagesLoading(true);
      const [configRes, memberRes] = await Promise.all([
        api.get('/system-settings/member-business-config'),
        api.get('/member-auth/me'),
      ]);
      setPackages(configRes.data?.termDepositRates || []);
      setEarlyBreakPenalty(configRes.data?.termDepositEarlyBreakPenalty || 0);
      setMember(memberRes.data);
    } catch (error) {
      console.error('Failed to fetch business config:', error);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeposits();
    fetchConfig();
  }, [fetchDeposits, fetchConfig]);

  const activeDeposits = deposits.filter((d) => d.status === 'active');
  const totalActivePrincipal = activeDeposits.reduce(
    (sum, d) => sum + d.principal,
    0,
  );
  const totalProjectedProfit = activeDeposits.reduce(
    (sum, d) => sum + d.projectedProfit,
    0,
  );
  const maturedDeposits = deposits.filter((d) => d.status === 'matured');
  const totalMaturedProfit = maturedDeposits.reduce(
    (sum, d) => sum + (d.actualProfit || d.projectedProfit),
    0,
  );
  const filteredDeposits = deposits.filter(
    (d) =>
      d.depositNumber?.toLowerCase().includes(search.toLowerCase()) ||
      d.status.toLowerCase().includes(search.toLowerCase()),
  );

  const principalNum = Number(principal) || 0;
  const projectedProfit = selectedPackage
    ? Math.round(
        (principalNum * selectedPackage.rate * selectedPackage.duration) /
          (12 * 100),
      )
    : 0;
  const maturityDate = selectedPackage
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + selectedPackage.duration);
        return d;
      })()
    : null;
  const availableBalance = member
    ? sourceAccount === 'saving'
      ? member.savingBalance || 0
      : member.currentBalance || 0
    : 0;

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setPrincipal('');
    setSourceAccount('current');
    setIsCreateOpen(true);
  };

  // Step 1: user clicks Lock → show confirmation
  const handleRequestCreate = () => {
    if (principalNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (principalNum > availableBalance) {
      toast.error(`Insufficient ${sourceAccount} balance`);
      return;
    }
    setIsCreateOpen(false);
    setShowCreateConfirm(true);
  };

  // Step 2: confirmed
  const handleConfirmCreate = async () => {
    try {
      setIsCreating(true);
      await api.post('/term-deposits/portal/create', {
        principal: principalNum,
        duration: selectedPackage.duration,
        sourceAccount,
      });
      toast.success('Term deposit created successfully!');
      setShowCreateConfirm(false);
      setSelectedPackage(null);
      setPrincipal('');
      fetchDeposits();
      fetchConfig();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create term deposit',
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Break: confirmed
  const handleConfirmBreak = async () => {
    if (!breakTarget) return;
    try {
      setIsBreaking(true);
      const res = await api.post(
        `/term-deposits/portal/${breakTarget._id}/break`,
      );
      toast.success(
        `Deposit broken. ${formatCurrency(res.data.totalReturn)} returned to your account.`,
      );
      setBreakTarget(null);
      fetchDeposits();
      fetchConfig();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to break deposit');
    } finally {
      setIsBreaking(false);
    }
  };

  // Calculate break preview for a deposit
  const getBreakPreview = (deposit) => {
    const msElapsed = Date.now() - new Date(deposit.startDate).getTime();
    const monthsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 30);
    const fullProfit = Math.round(
      (deposit.principal * deposit.profitRate * monthsElapsed) / (12 * 100),
    );
    const penaltyRate = deposit.earlyBreakPenaltyRate / 100;
    const actualProfit = Math.round(fullProfit * (1 - penaltyRate));
    const totalReturn = deposit.principal + Math.max(0, actualProfit);
    return {
      monthsElapsed: Math.floor(monthsElapsed),
      actualProfit: Math.max(0, actualProfit),
      totalReturn,
      penaltyForfeited: Math.round(fullProfit * penaltyRate),
    };
  };

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(MOBILE_PAGE_LIMIT);
  }, [search]);

  // Mobile infinite scroll observer
  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileVisibleCount < filteredDeposits.length) {
          setTimeout(() => setMobileVisibleCount((prev) => prev + MOBILE_PAGE_LIMIT), 400);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, mobileVisibleCount, filteredDeposits.length]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title="Term Deposits"
        description="Monitor your locked savings, track maturity dates, and view projected profits."
      />

      {loading ? (
        <CardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Active Locked Savings"
            amount={formatCurrency(totalActivePrincipal)}
            icon={<Lock size={20} />}
            color="bg-primary shadow-primary/20"
            subtitle={`${activeDeposits.length} active term deposits`}
          />
          <StatsCard
            title="Projected Profit"
            amount={formatCurrency(totalProjectedProfit)}
            icon={<TrendingUp size={20} />}
            color="bg-indigo-500 shadow-indigo-500/20"
            subtitle="Expected earnings on maturity"
          />
          <StatsCard
            title="Realized Profit"
            amount={formatCurrency(totalMaturedProfit)}
            icon={<CheckCircle2 size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
            subtitle={`${maturedDeposits.length} matured deposits`}
          />
        </div>
      )}

      {/* ─── Available Packages ─── */}
      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-indigo-500/10 rounded-xl border border-primary/10">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Available Packages
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">
                Choose a term and lock your savings to earn guaranteed profit
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-8">
          {packagesLoading ? (
            <CardsSkeleton count={3} />
          ) : packages.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Sparkles}
                title="No Packages Available"
                description="Your organization has not configured any term deposit packages yet."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {packages
                .sort((a, b) => a.duration - b.duration)
                .map((pkg, i) => {
                  const colors = [
                    {
                      bg: 'from-primary/10 to-indigo-500/5',
                      border: 'hover:border-primary/40',
                      icon: 'bg-primary/10 border-primary/20 text-primary',
                      badge: 'bg-primary/10 text-primary border-primary/20',
                    },
                    {
                      bg: 'from-indigo-500/10 to-violet-500/5',
                      border: 'hover:border-indigo-500/40',
                      icon: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
                      badge:
                        'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                    },
                    {
                      bg: 'from-emerald-500/10 to-teal-500/5',
                      border: 'hover:border-emerald-500/40',
                      icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
                      badge:
                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                    },
                    {
                      bg: 'from-amber-500/10 to-orange-500/5',
                      border: 'hover:border-amber-500/40',
                      icon: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
                      badge:
                        'bg-amber-500/10 text-amber-600 border-amber-500/20',
                    },
                    {
                      bg: 'from-rose-500/10 to-pink-500/5',
                      border: 'hover:border-rose-500/40',
                      icon: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
                      badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                    },
                  ];
                  const c = colors[i % colors.length];
                  return (
                    <button
                      key={pkg.duration}
                      onClick={() => handleSelectPackage(pkg)}
                      className={cn(
                        'group relative text-left rounded-3xl p-6 sm:p-8 transition-all overflow-hidden border-2 border-border/50 shadow-sm hover:shadow-xl',
                        c.border,
                      )}
                    >
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                          c.bg,
                        )}
                      />
                      <div className="relative">
                        <div className="flex items-center justify-between mb-5">
                          <div
                            className={cn(
                              'p-3 rounded-2xl border group-hover:scale-110 transition-transform duration-300',
                              c.icon,
                            )}
                          >
                            <Clock size={22} />
                          </div>
                          <div
                            className={cn(
                              'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
                              c.badge,
                            )}
                          >
                            {pkg.rate}% p.a.
                          </div>
                        </div>
                        <h3 className="text-4xl font-black tracking-tighter mb-1">
                          {pkg.duration}
                        </h3>
                        <p className="text-sm font-bold text-muted-foreground">
                          Months Term
                        </p>
                        <div className="mt-5 pt-5 border-t border-border/40 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Est. Profit on 10,000
                            </p>
                            <p className="text-lg font-black text-emerald-600">
                              +
                              {formatCurrency(
                                Math.round(
                                  (10000 * pkg.rate * pkg.duration) /
                                    (12 * 100),
                                ),
                              )}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Deposit Portfolio ─── */}
      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-xl">
              <Lock size={20} className="text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Deposit Portfolio
            </h2>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              type="text"
              placeholder="Search deposits..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 sm:p-8">
          {loading ? (
            <CardsSkeleton count={3} />
          ) : filteredDeposits.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Lock}
                title="No Term Deposits Found"
                description={
                  search
                    ? 'No deposits match your search criteria.'
                    : 'You do not have any active or past term deposits.'
                }
              />
            </div>
          ) : (
            <>
              <DepositGrid
                deposits={isMobile ? filteredDeposits.slice(0, mobileVisibleCount) : filteredDeposits.slice((currentPage - 1) * limit, currentPage * limit)}
                setBreakTarget={setBreakTarget}
              />
              {/* Mobile Infinite Scroll */}
              {isMobile && mobileVisibleCount < filteredDeposits.length && (
                <div ref={observerTarget} className="py-4">
                  <InfiniteLoader isFetchingMore={true} />
                </div>
              )}
            </>
          )}
        </div>
        {/* Desktop Pagination */}
        {!isMobile && filteredDeposits.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredDeposits.length / limit) || 1}
            totalEntries={filteredDeposits.length}
            limit={limit}
            onPageChange={(page) => setCurrentPage(page)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ─── Create Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl bg-background">
          <div className="p-8 border-b bg-background z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Lock size={24} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">
                  Lock Your Savings
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">
                  {selectedPackage
                    ? `${selectedPackage.duration} months at ${selectedPackage.rate}% annual profit`
                    : 'Configure your term deposit'}
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                Deposit Amount
              </label>
              <input
                type="number"
                placeholder="Enter amount to lock"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full px-5 py-4 text-2xl font-black bg-muted/50 border-2 border-border/50 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                Deduct From
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                {['current', 'saving'].map((acc) => (
                  <button
                    key={acc}
                    onClick={() => setSourceAccount(acc)}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-left transition-all',
                      sourceAccount === acc
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/50 hover:border-border',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet
                        size={14}
                        className={
                          sourceAccount === acc
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }
                      />
                      <span className="text-xs font-black uppercase tracking-widest">
                        {acc}
                      </span>
                    </div>
                    <p className="text-lg font-black">
                      {formatCurrency(
                        acc === 'saving'
                          ? member?.savingBalance || 0
                          : member?.currentBalance || 0,
                      )}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                      Available balance
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {principalNum > 0 && selectedPackage && (
              <div className="p-5 rounded-2xl bg-emerald-500/5 border-2 border-emerald-500/20 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Investment Preview
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Projected Profit
                    </p>
                    <p className="text-xl font-black text-emerald-600">
                      +{formatCurrency(projectedProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Maturity Date
                    </p>
                    <p className="text-xl font-black">
                      {maturityDate?.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Total at Maturity
                    </p>
                    <p className="text-xl font-black text-primary">
                      {formatCurrency(principalNum + projectedProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      Remaining Balance
                    </p>
                    <p
                      className={cn(
                        'text-xl font-black',
                        availableBalance - principalNum < 0 && 'text-rose-500',
                      )}
                    >
                      {formatCurrency(availableBalance - principalNum)}
                    </p>
                  </div>
                </div>
                {earlyBreakPenalty > 0 && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-500/10 p-2.5 rounded-lg">
                    <AlertCircle size={12} />
                    Breaking early will forfeit {earlyBreakPenalty}% of accrued
                    profit
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-8 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="flex-1 rounded-[1.25rem] min-h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestCreate}
              className="flex-1 rounded-[1.25rem] min-h-14 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
              disabled={principalNum <= 0 || principalNum > availableBalance}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Confirmation ─── */}
      <TransactionConfirmModal
        isOpen={showCreateConfirm}
        onClose={() => {
          setShowCreateConfirm(false);
          setIsCreateOpen(true);
        }}
        onConfirm={handleConfirmCreate}
        loading={isCreating}
        type="debit"
        title="Confirm Term Deposit"
        amount={principalNum}
        confirmText="Lock Funds"
        details={[
          {
            label: 'Duration',
            value: selectedPackage ? `${selectedPackage.duration} Months` : '—',
          },
          {
            label: 'Profit Rate',
            value: selectedPackage ? `${selectedPackage.rate}% p.a.` : '—',
          },
          { label: 'Projected Profit', value: formatCurrency(projectedProfit) },
          {
            label: 'Source Account',
            value:
              sourceAccount.charAt(0).toUpperCase() + sourceAccount.slice(1),
          },
          {
            label: 'Maturity Date',
            value: maturityDate ? maturityDate.toLocaleDateString() : '—',
          },
        ]}
        description="Your funds will be locked for the selected duration. Early withdrawal will incur a penalty."
      />

      {/* ─── Break Confirmation ─── */}
      {breakTarget &&
        (() => {
          const preview = getBreakPreview(breakTarget);
          return (
            <TransactionConfirmModal
              isOpen={!!breakTarget}
              onClose={() => setBreakTarget(null)}
              onConfirm={handleConfirmBreak}
              loading={isBreaking}
              type="custom"
              title="Break Term Deposit Early"
              amount={preview.totalReturn}
              confirmText="Break Deposit"
              details={[
                { label: 'Deposit', value: breakTarget.depositNumber },
                {
                  label: 'Principal',
                  value: formatCurrency(breakTarget.principal),
                },
                {
                  label: 'Months Elapsed',
                  value: `${preview.monthsElapsed} months`,
                },
                {
                  label: 'Profit After Penalty',
                  value: formatCurrency(preview.actualProfit),
                },
                {
                  label: 'Penalty Forfeited',
                  value: formatCurrency(preview.penaltyForfeited),
                },
                {
                  label: 'Total Return',
                  value: formatCurrency(preview.totalReturn),
                },
              ]}
              description={`Breaking early will apply a ${breakTarget.earlyBreakPenaltyRate}% penalty on accrued profit. ${formatCurrency(preview.totalReturn)} will be credited to your ${breakTarget.sourceAccount} account.`}
            />
          );
        })()}
    </div>
  );
};

// ─── Extracted Deposit Card Grid ───
const DepositGrid = ({ deposits, setBreakTarget }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    {deposits.map((deposit) => {
      const isActive = deposit.status === 'active';
      const isMatured = deposit.status === 'matured';
      const isBroken = deposit.status === 'broken';
      return (
        <div
          key={deposit._id}
          className="group relative bg-background border border-border/50 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all overflow-hidden"
        >
          <div
            className={cn(
              'absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-[10px] font-black uppercase tracking-widest text-white z-10',
              isActive && 'bg-amber-500',
              isMatured && 'bg-emerald-500',
              isBroken && 'bg-rose-500',
            )}
          >
            {deposit.status}
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div
              className={cn(
                'p-4 rounded-2xl border flex-shrink-0 transition-transform group-hover:scale-105',
                isActive
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : isMatured
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500',
              )}
            >
              {isActive ? (
                <Lock size={24} />
              ) : isMatured ? (
                <CheckCircle2 size={24} />
              ) : (
                <XCircle size={24} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">
                {deposit.depositNumber || 'TD-XXXX'}
              </h3>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {deposit.duration} Months Term @ {deposit.profitRate}%
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 p-4 bg-muted/50 rounded-2xl">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 line-clamp-1" title="Principal Amount">Principal</p>
              <p className="font-black sm:text-lg text-base">{formatCurrency(deposit.principal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 line-clamp-1" title="Projected Profit">Projected</p>
              <p className="font-black sm:text-lg text-base text-indigo-500">+{formatCurrency(deposit.projectedProfit)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 line-clamp-1" title="Realized Profit">Realized</p>
              <p className={cn('font-black sm:text-lg text-base', isMatured ? 'text-emerald-500' : isBroken ? 'text-rose-500' : 'text-muted-foreground/40')}>
                +{formatCurrency(deposit.actualProfit)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} />
              <span>Started: {new Date(deposit.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={14} />
              <span className={cn(isActive && 'text-foreground font-bold')}>
                Maturity: {new Date(deposit.maturityDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          {isBroken && deposit.brokenAt && (
            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-rose-500 bg-rose-500/10 p-2.5 rounded-lg">
              <AlertCircle size={14} />
              Broken early on {new Date(deposit.brokenAt).toLocaleDateString()}
            </div>
          )}
          {isActive && (
            <button
              onClick={() => setBreakTarget(deposit)}
              className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition-all active:scale-[0.98]"
            >
              <Unlock size={14} />
              Break Early
            </button>
          )}
        </div>
      );
    })}
  </div>
);

export default MemberTermDeposits;
