import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import api from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ── Action → human-friendly label & tone ────────────────────────────────────
// Keep this map close to the `logActivity` call sites that fire each action.
// Anything missing falls back to a Title Cased version of the action string.
const ACTION_PRESENTATION = {
  member_created: { label: 'Member created', tone: 'emerald', icon: ShieldCheck },
  member_updated: { label: 'Profile updated', tone: 'indigo' },
  member_deleted: { label: 'Member deleted', tone: 'rose' },
  member_investment_added: { label: 'Deposit (current)', tone: 'emerald' },
  member_saving_deposit: { label: 'Deposit (saving)', tone: 'emerald' },
  member_withdrawal: { label: 'Withdrawal (current)', tone: 'rose' },
  member_saving_withdrawal: { label: 'Withdrawal (saving)', tone: 'rose' },
  fund_transfer_sent: { label: 'Transfer out', tone: 'rose' },
  fund_transfer_received: { label: 'Transfer in', tone: 'emerald' },
  admin_member_to_member_transfer: { label: 'Admin transfer', tone: 'indigo' },
  members_bulk_imported: { label: 'Bulk import', tone: 'indigo' },
  member_approved: { label: 'Approved', tone: 'emerald' },
  member_rejected: { label: 'Rejected', tone: 'rose' },
  member_password_reset: { label: 'Password reset', tone: 'amber' },
  member_pin_set: { label: 'Transaction PIN set', tone: 'amber' },
  member_pin_reset: { label: 'Transaction PIN reset', tone: 'amber' },
  member_tier_assigned: { label: 'Tier assigned', tone: 'indigo' },
  term_deposit_created: { label: 'Term deposit opened', tone: 'emerald' },
  term_deposit_broken: { label: 'Term deposit broken', tone: 'amber' },
  bulk_email_sent: { label: 'Bulk email sent', tone: 'indigo' },
  profit_distributed: { label: 'Profit distributed', tone: 'emerald' },
};

const TONES = {
  emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const titleCase = (str) =>
  str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Pretty-print a primitive metadata value. Objects/arrays render as compact
// JSON so the diff stays readable.
const formatValue = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'number') return v.toLocaleString();
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      try {
        return format(new Date(v), 'MMM dd, yyyy hh:mm a');
      } catch {
        return v;
      }
    }
    return v;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

// Build a list of changed fields between two snapshots. Both sides are
// shallow-merged keys; we only emit rows where the value actually differs.
const diffSnapshots = (before, after) => {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object')
    return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const rows = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) rows.push({ key, before: a, after: b });
  }
  return rows;
};

const AuditLogRow = ({ log }) => {
  const [expanded, setExpanded] = useState(false);
  const preset = ACTION_PRESENTATION[log.action] || { tone: 'slate' };
  const label = preset.label || titleCase(log.action);
  const toneClass = TONES[preset.tone] || TONES.slate;
  const Icon = preset.icon || Activity;

  const actorName =
    log.user?.name?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'System';
  const actorRole = log.user?.role || null;
  const when = log.createdAt ? new Date(log.createdAt) : null;

  const diff = diffSnapshots(log.metadata?.before, log.metadata?.after);
  // Metadata keys that aren't part of a before/after snapshot — surface them
  // as small chips on the row (amount, accountType, etc.) so the most-used
  // context is visible without expanding.
  const metaChips = Object.entries(log.metadata || {}).filter(
    ([k, v]) =>
      !['memberId', 'before', 'after', 'branchId', 'link'].includes(k) &&
      typeof v !== 'object',
  );
  const canExpand = diff.length > 0 || !!log.details || metaChips.length > 2;

  return (
    <div className="relative flex gap-4 group">
      {/* Timeline rail dot */}
      <div className="flex flex-col items-center pt-1.5">
        <div
          className={`h-7 w-7 rounded-full border flex items-center justify-center shrink-0 ${toneClass}`}
        >
          <Icon size={12} />
        </div>
        <div className="flex-1 w-px bg-slate-200 dark:bg-white/[0.08] mt-2" />
      </div>

      {/* Row body */}
      <div className="flex-1 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              {label}
            </p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCircle2 size={11} />
              <span className="font-semibold">{actorName}</span>
              {actorRole && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {actorRole}
                </span>
              )}
            </p>
          </div>
          {when && (
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {formatDistanceToNow(when, { addSuffix: true })}
              </p>
              <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
                {format(when, 'MMM dd · hh:mm a')}
              </p>
            </div>
          )}
        </div>

        {log.details && (
          <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1">
            {log.details}
          </p>
        )}

        {/* Inline meta chips — the first 2 quick facts. */}
        {metaChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {metaChips.slice(0, expanded ? metaChips.length : 2).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100/70 dark:bg-white/[0.04] text-[10px] font-bold"
              >
                <span className="text-slate-400 dark:text-slate-500">{titleCase(k)}:</span>
                <span className="text-slate-700 dark:text-slate-200 font-mono">
                  {formatValue(v)}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Expanded: before/after diff */}
        {expanded && diff.length > 0 && (
          <div className="mt-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
              Changes
            </p>
            <div className="space-y-1.5">
              {diff.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[100px_1fr] gap-2 text-[11px]"
                >
                  <span className="font-bold text-slate-500 dark:text-slate-400 truncate">
                    {titleCase(row.key)}
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">
                    <span className="line-through text-rose-500/80">
                      {formatValue(row.before)}
                    </span>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">→</span>
                    <span className="text-emerald-600 font-bold">
                      {formatValue(row.after)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80"
          >
            {expanded ? (
              <>
                <ChevronUp size={11} />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown size={11} />
                Show details
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const MemberAuditLog = ({ memberId, limit = 10 }) => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(
    async (page = 1, append = false) => {
      if (!memberId) return;
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        const { data } = await api.get(`/members/${memberId}/audit-log`, {
          params: { page, limit },
        });
        setLogs((prev) => (append ? [...prev, ...data.logs] : data.logs));
        setPagination(data.pagination);
      } catch (err) {
        console.error('Audit log fetch error:', err);
        setError(err?.response?.data?.message || 'Failed to load audit log');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [memberId, limit],
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-border/50 p-5 sm:p-8 rounded-[2.5rem] space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <History size={16} />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              Audit Timeline
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Who touched this account · {pagination.total || 0}{' '}
              {pagination.total === 1 ? 'event' : 'events'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-rose-500 font-bold p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            No audit events recorded for this member yet.
          </p>
        </div>
      ) : (
        <>
          <div>
            {logs.map((log) => (
              <AuditLogRow key={log._id} log={log} />
            ))}
          </div>
          {pagination.page < pagination.pages && (
            <Button
              variant="outline"
              onClick={() => fetchPage(pagination.page + 1, true)}
              disabled={loadingMore}
              className="w-full rounded-full font-black text-[10px] uppercase tracking-widest"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load more (${pagination.total - logs.length} remaining)`
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default MemberAuditLog;
