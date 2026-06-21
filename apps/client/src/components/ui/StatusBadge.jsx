/* eslint-disable react/prop-types -- project convention: no propTypes (see EmptyState et al.) */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tone styles for status pills. The app's design language assigns emerald to
 * success, amber to warning, rose to error, and slate to neutral states.
 */
const TONE_STYLES = {
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20',
  error:
    'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20',
  info: 'bg-primary/10 text-primary ring-primary/20 dark:bg-primary/15 dark:text-primary',
  neutral:
    'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20',
};

const DOT_STYLES = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
  info: 'bg-primary',
  neutral: 'bg-slate-400',
};

/**
 * Maps domain status strings → a tone. Centralises the color logic that was
 * copy-pasted (inconsistently) across dozens of components. Unknown statuses
 * fall back to neutral.
 */
const STATUS_TONE = {
  // success
  active: 'success',
  approved: 'success',
  paid: 'success',
  completed: 'success',
  complete: 'success',
  success: 'success',
  verified: 'success',
  disbursed: 'success',
  settled: 'success',
  cleared: 'success',
  resolved: 'success',
  enabled: 'success',
  open: 'success',
  matured: 'success',
  renewed: 'success',
  issued: 'success',
  accepted: 'success',
  // warning
  pending: 'warning',
  processing: 'warning',
  partial: 'warning',
  'in review': 'warning',
  in_review: 'warning',
  awaiting: 'warning',
  scheduled: 'warning',
  due: 'warning',
  'on hold': 'warning',
  on_hold: 'warning',
  submitted: 'warning',
  requested: 'warning',
  paused: 'warning',
  // error
  overdue: 'error',
  defaulted: 'error',
  default: 'error',
  rejected: 'error',
  declined: 'error',
  failed: 'error',
  cancelled: 'error',
  canceled: 'error',
  expired: 'error',
  blocked: 'error',
  suspended: 'error',
  late: 'error',
  broken: 'error',
  bounced: 'error',
  // neutral
  inactive: 'neutral',
  draft: 'neutral',
  closed: 'neutral',
  archived: 'neutral',
  disabled: 'neutral',
  unknown: 'neutral',
  refunded: 'neutral',
  revoked: 'neutral',
};

/**
 * Convert a status key into a human label: `in_review` → `In Review`.
 * @param {string} status
 * @returns {string}
 */
const humanize = (status) =>
  String(status)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Standardised status indicator pill. Resolves a tone from the status string,
 * or accepts an explicit `tone` override.
 *
 * @param {object} props
 * @param {string} props.status - Domain status (e.g. `'active'`, `'overdue'`).
 * @param {React.ReactNode} [props.label] - Override the displayed text.
 * @param {'success'|'warning'|'error'|'info'|'neutral'} [props.tone] - Override the resolved tone.
 * @param {boolean} [props.showDot=true] - Render the leading status dot.
 * @param {string} [props.className] - Extra classes.
 * @returns {JSX.Element}
 *
 * @example
 * <StatusBadge status="active" />   // emerald
 * <StatusBadge status="overdue" />  // rose
 */
const StatusBadge = ({ status, label, tone, showDot = true, className }) => {
  const resolvedTone = tone || STATUS_TONE[String(status).toLowerCase()] || 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize whitespace-nowrap',
        TONE_STYLES[resolvedTone],
        className,
      )}
    >
      {showDot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', DOT_STYLES[resolvedTone])}
          aria-hidden="true"
        />
      )}
      {label ?? humanize(status)}
    </span>
  );
};

export default StatusBadge;
export { StatusBadge, STATUS_TONE };
