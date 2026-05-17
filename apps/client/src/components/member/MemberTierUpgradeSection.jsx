import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import {
  Shield,
  Check,
  Loader2,
  ArrowRight,
  Wallet,
  TrendingUp,
  Lock,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { memberAtom } from '@/atoms';

const SLOT_RANK = { basic: 0, standard: 1, premium: 2 };

const SLOT_ACCENT = {
  basic: {
    chip: 'bg-slate-500/10 text-slate-600',
    border: 'border-slate-200 dark:border-white/[0.08]',
  },
  standard: {
    chip: 'bg-primary/10 text-primary',
    border: 'border-primary/30',
  },
  premium: {
    chip: 'bg-emerald-500/10 text-emerald-600',
    border: 'border-emerald-500/30',
  },
};

const CHANNEL_LABELS = {
  internal_transfer: 'Member transfer',
  external_transfer: 'Bank withdrawal',
  goal_contribution: 'Goal contribution',
};

const MemberTierUpgradeSection = () => {
  const [member, setMember] = useAtom(memberAtom);
  const [tiers, setTiers] = useState([]);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingTier, setPendingTier] = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [tiersRes, limitsRes] = await Promise.all([
        api.get('/transfer-limit-tiers/portal/available'),
        api.get('/transfer-limit-tiers/portal/my-limits'),
      ]);
      setTiers(Array.isArray(tiersRes.data) ? tiersRes.data : []);
      setLimits(limitsRes.data?.tier ? limitsRes.data : null);
    } catch {
      toast.error('Failed to load membership tiers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const currentSlot = limits?.tier?.slot || 'basic';
  const currentRank = SLOT_RANK[currentSlot] ?? 0;

  const handleUpgrade = async () => {
    if (!pendingTier) return;
    setUpgrading(true);
    try {
      const { data } = await api.post('/transfer-limit-tiers/portal/upgrade', {
        tierId: pendingTier._id,
      });
      toast.success(
        data?.feeCharged > 0
          ? `Upgraded to ${data.tier.name} — Rs. ${data.feeCharged.toLocaleString()} fee deducted.`
          : `Upgraded to ${data.tier.name}.`,
      );
      // Sync member atom currentBalance optimistically using API-derived deduction.
      if (data?.feeCharged > 0 && member) {
        setMember((prev) =>
          prev
            ? {
                ...prev,
                currentBalance: Math.max(
                  0,
                  (prev.currentBalance || 0) - data.feeCharged,
                ),
              }
            : prev,
        );
      }
      setPendingTier(null);
      refresh();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          'Could not complete the upgrade. Try again.',
      );
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-6 flex items-center gap-3">
        <Loader2 size={14} className="animate-spin text-primary" />
        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
          Loading membership tiers…
        </p>
      </div>
    );
  }

  const currentBalance = member?.currentBalance || 0;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
          Membership tier
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upgrade for higher per-transaction and daily transfer limits.
          Upgrade fees are debited from your current account.
        </p>
      </div>

      {/* Current tier summary */}
      {limits?.tier && (
        <div className="rounded-[2rem] border border-primary/20 bg-primary/[0.04] p-5 sm:p-6 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Shield size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/80">
                Current tier
              </p>
              <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                {limits.tier.name}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Daily{' '}
                {limits.daily?.cap > 0
                  ? formatCurrency(limits.daily.cap)
                  : 'unlimited'}{' '}
                ·{' '}
                {limits.daily?.remaining !== null
                  ? `${formatCurrency(limits.daily.remaining || 0)} remaining today`
                  : 'no daily cap'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tier catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {tiers.map((tier) => {
          const accent = SLOT_ACCENT[tier.slot] || SLOT_ACCENT.basic;
          const isCurrent = tier.slot === currentSlot;
          const rank = SLOT_RANK[tier.slot] ?? 0;
          const isUpgrade = rank > currentRank;
          const canAfford = currentBalance >= (tier.upgradeFee || 0);
          return (
            <div
              key={tier._id}
              className={cn(
                'flex flex-col rounded-[2rem] border-2 bg-white dark:bg-white/[0.02] p-5 sm:p-6 gap-4 transition-all',
                isCurrent ? 'border-primary' : accent.border,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] mb-1',
                      accent.chip,
                    )}
                  >
                    {tier.slot}
                  </span>
                  <h4 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                    {tier.name}
                  </h4>
                </div>
                {isCurrent && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white text-[9px] font-extrabold uppercase tracking-[0.12em]">
                    <Check size={10} strokeWidth={3} /> Current
                  </span>
                )}
              </div>

              {tier.description && (
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  {tier.description}
                </p>
              )}

              {/* Limits */}
              <div className="space-y-1.5">
                {Object.entries(CHANNEL_LABELS).map(([ch, label]) => {
                  const cap = tier.perChannelLimits?.[ch]?.perTransaction || 0;
                  return (
                    <div
                      key={ch}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {label}
                      </span>
                      <span className="font-extrabold tabular-nums text-slate-900 dark:text-white shrink-0">
                        {cap > 0 ? formatCurrency(cap) : '∞'}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between gap-2 text-[11px] pt-1.5 border-t border-slate-100 dark:border-white/[0.06]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Daily cap
                  </span>
                  <span className="font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {tier.dailyCumulativeCap > 0
                      ? formatCurrency(tier.dailyCumulativeCap)
                      : '∞'}
                  </span>
                </div>
              </div>

              {/* Fee + CTA — pinned to the bottom so all three cards align. */}
              <div className="mt-auto pt-2">
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 py-2">
                    Active tier
                  </div>
                ) : isUpgrade ? (
                  <Button
                    onClick={() => setPendingTier(tier)}
                    disabled={!canAfford}
                    className={cn(
                      'w-full h-11 rounded-full font-bold text-[12px] uppercase tracking-[0.12em] flex items-center justify-center gap-2 transition-all',
                      canAfford
                        ? 'bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5'
                        : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 cursor-not-allowed',
                    )}
                  >
                    {!canAfford ? (
                      <>
                        <Lock size={12} /> Insufficient balance
                      </>
                    ) : tier.upgradeFee > 0 ? (
                      <>
                        Upgrade · {formatCurrency(tier.upgradeFee)}
                        <ArrowRight size={12} strokeWidth={3} />
                      </>
                    ) : (
                      <>
                        Upgrade · Free
                        <ArrowRight size={12} strokeWidth={3} />
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 py-2">
                    Contact admin to switch
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      <Dialog
        open={!!pendingTier}
        onOpenChange={(open) => !open && setPendingTier(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 pr-8">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1">
                  Confirm upgrade
                </p>
                <DialogTitle>
                  Move to {pendingTier?.name || ''}?
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {pendingTier?.upgradeFee > 0
                    ? `A one-time fee of Rs. ${pendingTier.upgradeFee.toLocaleString()} will be deducted from your current account.`
                    : 'This upgrade is free.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {pendingTier && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                  New daily cap
                </span>
                <span className="font-extrabold tabular-nums">
                  {pendingTier.dailyCumulativeCap > 0
                    ? formatCurrency(pendingTier.dailyCumulativeCap)
                    : 'Unlimited'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Wallet size={11} /> Your balance
                </span>
                <span className="font-extrabold tabular-nums">
                  {formatCurrency(currentBalance)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06] pt-5">
            <button
              type="button"
              onClick={() => setPendingTier(null)}
              className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
            >
              Cancel
            </button>
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              {upgrading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" />
                  Upgrading
                </>
              ) : (
                <>Confirm upgrade</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default MemberTierUpgradeSection;
