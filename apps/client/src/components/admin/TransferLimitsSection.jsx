import { useEffect, useState } from 'react';
import {
  Shield,
  Save,
  Loader2,
  Info,
  ArrowDownLeft,
  Building2,
  Target,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

const CHANNEL_META = {
  internal_transfer: {
    label: 'Member transfer',
    description: 'P2P transfers to other members.',
    icon: ArrowDownLeft,
  },
  external_transfer: {
    label: 'Bank withdrawal',
    description: 'Outbound transfers to a real bank.',
    icon: Building2,
  },
  goal_contribution: {
    label: 'Goal contribution',
    description: 'Sweeps into a saving goal.',
    icon: Target,
  },
};

const SLOT_BADGE = {
  basic: 'bg-slate-500/10 text-slate-600',
  standard: 'bg-primary/10 text-primary',
  premium: 'bg-emerald-500/10 text-emerald-600',
};

const SkeletonCard = () => (
  <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-slate-100 dark:bg-white/[0.06]" />
          <div className="h-4 w-24 rounded bg-slate-100/70 dark:bg-white/[0.04]" />
        </div>
      </div>
      <div className="h-8 w-16 rounded-full bg-slate-100 dark:bg-white/[0.06]" />
    </div>
    <div className="h-16 rounded-2xl bg-slate-100/50 dark:bg-white/[0.02]" />
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-14 rounded-2xl bg-slate-100/40 dark:bg-white/[0.02]"
      />
    ))}
  </div>
);

const TierCard = ({ tier, onSave }) => {
  const [draft, setDraft] = useState(() => ({
    name: tier.name,
    description: tier.description || '',
    perChannelLimits: {
      internal_transfer: {
        perTransaction:
          tier.perChannelLimits?.internal_transfer?.perTransaction || 0,
      },
      external_transfer: {
        perTransaction:
          tier.perChannelLimits?.external_transfer?.perTransaction || 0,
      },
      goal_contribution: {
        perTransaction:
          tier.perChannelLimits?.goal_contribution?.perTransaction || 0,
      },
    },
    dailyCumulativeCap: tier.dailyCumulativeCap || 0,
    upgradeFee: tier.upgradeFee || 0,
  }));
  const [saving, setSaving] = useState(false);

  const handleChannelChange = (channel, value) => {
    setDraft((d) => ({
      ...d,
      perChannelLimits: {
        ...d.perChannelLimits,
        [channel]: { perTransaction: Number(value) || 0 },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await onSave(tier._id, draft);
      if (updated) {
        setDraft({
          name: updated.name,
          description: updated.description || '',
          perChannelLimits: {
            internal_transfer: {
              perTransaction:
                updated.perChannelLimits?.internal_transfer?.perTransaction ||
                0,
            },
            external_transfer: {
              perTransaction:
                updated.perChannelLimits?.external_transfer?.perTransaction ||
                0,
            },
            goal_contribution: {
              perTransaction:
                updated.perChannelLimits?.goal_contribution?.perTransaction ||
                0,
            },
          },
          dailyCumulativeCap: updated.dailyCumulativeCap || 0,
          upgradeFee: updated.upgradeFee || 0,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.12em] mb-1',
                SLOT_BADGE[tier.slot],
              )}
            >
              {tier.slot}
            </span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              className="block w-full text-base sm:text-lg font-extrabold tracking-tight bg-transparent border-0 border-b border-transparent focus:border-primary/30 focus:outline-none px-0 py-0.5 truncate"
              placeholder="Tier name"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary text-white text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} strokeWidth={2.5} />
          )}
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>

      <textarea
        value={draft.description}
        onChange={(e) =>
          setDraft((d) => ({ ...d, description: e.target.value }))
        }
        placeholder="Internal description (admin-only)"
        rows={2}
        className="w-full text-[12px] font-medium text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />

      {/* Per-channel limits */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          Per-transaction limits
        </p>
        {Object.keys(CHANNEL_META).map((ch) => {
          const meta = CHANNEL_META[ch];
          const Icon = meta.icon;
          const value = draft.perChannelLimits[ch].perTransaction;
          return (
            <div
              key={ch}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                    {meta.label}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:shrink-0">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  Rs.
                </span>
                <input
                  type="number"
                  min={0}
                  value={value}
                  onChange={(e) => handleChannelChange(ch, e.target.value)}
                  className="flex-1 sm:flex-none sm:w-32 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-3 py-2 text-sm font-extrabold tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          );
        })}
        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5 pl-1">
          <Info size={10} /> Set 0 to disable the cap for that channel.
        </p>
      </div>

      {/* Daily cap */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          Daily cumulative cap
        </p>
        <div className="flex items-center gap-2 p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
            Rs.
          </span>
          <input
            type="number"
            min={0}
            value={draft.dailyCumulativeCap}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                dailyCumulativeCap: Number(e.target.value) || 0,
              }))
            }
            className="flex-1 min-w-0 rounded-xl bg-transparent border-0 px-2 py-1 text-base font-extrabold tabular-nums focus:outline-none"
          />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
            {draft.dailyCumulativeCap > 0
              ? `${formatCurrency(draft.dailyCumulativeCap)} / day`
              : 'Unlimited'}
          </span>
        </div>
      </div>

      {/* Upgrade fee — charged when a member moves INTO this tier. Basic is
          the default-on-create tier so leaving its fee at 0 is normal. */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
          {tier.slot === 'basic'
            ? 'Upgrade fee (default tier — usually free)'
            : 'Upgrade fee (one-time, debited from current)'}
        </p>
        <div className="flex items-center gap-2 p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02]">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
            Rs.
          </span>
          <input
            type="number"
            min={0}
            value={draft.upgradeFee}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                upgradeFee: Number(e.target.value) || 0,
              }))
            }
            className="flex-1 min-w-0 rounded-xl bg-transparent border-0 px-2 py-1 text-base font-extrabold tabular-nums focus:outline-none"
          />
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
            {draft.upgradeFee > 0
              ? `${formatCurrency(draft.upgradeFee)} once`
              : 'Free'}
          </span>
        </div>
      </div>
    </div>
  );
};

const TransferLimitsSection = () => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/transfer-limit-tiers')
      .then(({ data }) => {
        if (!cancelled) setTiers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load transfer limits.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveTier = async (id, payload) => {
    try {
      const { data } = await api.put(`/transfer-limit-tiers/${id}`, payload);
      setTiers((prev) => prev.map((t) => (t._id === id ? data : t)));
      toast.success('Tier updated.');
      return data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier.');
      return null;
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
          Transfer limits
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Per-tier caps on member debits. Members without an explicit
          assignment fall back to the <strong>Standard</strong> tier.
        </p>
      </div>

      {/* Stacked full-width cards. The settings content pane is narrow once
          the left tab rail and the account-health side card eat their share,
          so 2/3-col layouts truncate badly. */}
      <div className="space-y-4 sm:space-y-6">
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          : tiers.map((tier) => (
              <TierCard key={tier._id} tier={tier} onSave={handleSaveTier} />
            ))}
      </div>
    </section>
  );
};

export default TransferLimitsSection;
