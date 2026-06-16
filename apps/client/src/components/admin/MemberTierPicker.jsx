import { useEffect, useState } from 'react';
import { Shield, Loader2, Check } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import { Button } from '@/components/ui/button';

/**
 * Compact admin block for assigning a Transfer Limit tier to a member. Lazy
 * loads the tenant's three tiers, highlights the current selection, and
 * persists via the dedicated assignment endpoint so it doesn't depend on
 * the larger MemberProfile edit form.
 */
const SLOT_COLOR = {
  basic: 'border-slate-200 dark:border-white/[0.08]',
  standard: 'border-primary/30',
  premium: 'border-emerald-500/30',
};

const MemberTierPicker = ({ memberId, currentTierId, onChange }) => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(currentTierId || null);
  // Pending tier change awaiting confirmation: { tier } to assign, or
  // { clear: true } to reset to the Standard default. null = no modal.
  const [pendingTier, setPendingTier] = useState(null);

  useEffect(() => {
    setSelected(currentTierId || null);
  }, [currentTierId]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/transfer-limit-tiers')
      .then(({ data }) => {
        if (!cancelled) setTiers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load tiers.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const executeAssign = async (tierId) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.put(`/transfer-limit-tiers/assign/${memberId}`, { tierId });
      setSelected(tierId);
      toast.success(
        tierId ? 'Tier assigned.' : 'Tier cleared — using Standard default.',
      );
      if (onChange) onChange(tierId);
      setPendingTier(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign tier.');
    } finally {
      setSaving(false);
    }
  };

  // Selecting a tier (or clearing) opens a confirmation modal first, mirroring
  // the destructive-action confirm pattern used elsewhere in the app.
  const requestAssign = (tier) => {
    if (saving) return;
    // Re-selecting the already-active tier is a no-op — skip the prompt.
    if (String(selected) === String(tier._id)) return;
    setPendingTier({ tier });
  };

  const requestClear = () => {
    if (saving) return;
    setPendingTier({ clear: true });
  };

  const confirmPending = () => {
    if (!pendingTier) return;
    executeAssign(pendingTier.clear ? null : pendingTier.tier._id);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-6 flex items-center gap-3">
        <Loader2 size={14} className="animate-spin text-primary" />
        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
          Loading transfer limit tiers…
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-6 sm:p-8 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Transfer limits
            </p>
            <h3 className="text-base font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
              Tier assignment
            </h3>
          </div>
        </div>
        {/* <Link
          to="/transfer-limits"
          className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary hover:underline"
        >
          Manage tiers →
        </Link> */}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier) => {
          const isActive = String(selected) === String(tier._id);
          return (
            <Button
              key={tier._id}
              type="button"
              variant="ghost"
              onClick={() => requestAssign(tier)}
              disabled={saving}
              className={cn(
                'group text-left p-4 rounded-2xl border-2 transition-all',
                isActive
                  ? 'border-primary bg-primary/5 shadow-[0_10px_30px_-15px_rgba(99,102,241,0.5)] hover:bg-primary/5'
                  : `bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] ${SLOT_COLOR[tier.slot]}`,
                saving && 'opacity-60 cursor-not-allowed',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {tier.slot}
                </span>
                {isActive && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </div>
              <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                {tier.name}
              </p>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                Daily{' '}
                {tier.dailyCumulativeCap > 0
                  ? formatCurrency(tier.dailyCumulativeCap)
                  : '∞'}
              </p>
            </Button>
          );
        })}
      </div>

      {selected && (
        <Button
          type="button"
          variant="ghost"
          onClick={requestClear}
          disabled={saving}
          className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-rose-500 disabled:opacity-60 transition-colors"
        >
          Clear assignment (use Standard default)
        </Button>
      )}

      <ConfirmActionModal
        isOpen={!!pendingTier}
        onClose={() => !saving && setPendingTier(null)}
        onConfirm={confirmPending}
        loading={saving}
        variant="warning"
        title={
          pendingTier?.clear ? 'Clear tier assignment' : 'Change transfer limit tier'
        }
        description={
          pendingTier?.clear ? (
            <>
              Remove this member&apos;s tier assignment? They will fall back to
              the <strong>Standard</strong> default transfer limits.
            </>
          ) : (
            <>
              Assign the <strong>{pendingTier?.tier?.name}</strong> tier? Their
              daily transfer cap will become{' '}
              <strong>
                {pendingTier?.tier?.dailyCumulativeCap > 0
                  ? formatCurrency(pendingTier.tier.dailyCumulativeCap)
                  : 'unlimited'}
              </strong>
              .
            </>
          )
        }
        confirmText={pendingTier?.clear ? 'Clear assignment' : 'Assign tier'}
      />
    </div>
  );
};

export default MemberTierPicker;
