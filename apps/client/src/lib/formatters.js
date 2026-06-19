/**
 * Centralised display formatters for currency, dates, and PKR-domain
 * identifiers (CNIC, phone, account numbers).
 *
 * This module is the single source of truth — `@/lib/utils` re-exports
 * everything here for backward compatibility, so existing
 * `import { formatCurrency } from '@/lib/utils'` call sites keep working
 * while new code can import directly from `@/lib/formatters`.
 *
 * All money in FinFlo is stored in major currency units (rupees + paisa to
 * 2 dp), never minor units — so formatters never divide by 100.
 */

/**
 * Resolve the active business currency symbol from persisted auth state.
 * Reads the business user first, then falls back to the member object.
 * @returns {string} Currency symbol, defaulting to `'Rs.'`.
 */
export const getCurrencySymbol = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.currency) return user.currency;
    }
    const memberStr = localStorage.getItem('memberData');
    if (memberStr) {
      const member = JSON.parse(memberStr);
      if (member?.currency) return member.currency;
    }
  } catch {
    // Ignore parse errors — fall through to the default symbol.
  }
  return 'Rs.';
};

// Money is stored to 2 dp (rupees + paisa). Show up to 2 decimals so paisa
// appear when present, without forcing a trailing ".00" on whole amounts.
const MONEY_FORMAT = { minimumFractionDigits: 0, maximumFractionDigits: 2 };

/**
 * Format an amount as currency with the active business symbol.
 * @param {number|null|undefined} num - Amount in major units (rupees).
 * @returns {string} e.g. `"Rs.12,500"` or `"-Rs.300.50"`.
 */
export const formatCurrency = (num) => {
  const symbol = getCurrencySymbol();
  if (num === undefined || num === null) return `${symbol}0`;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString(undefined, MONEY_FORMAT);
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
};

/**
 * Identical to {@link formatCurrency}; retained as a named alias used across
 * detail views where the intent ("show the full value") reads clearer.
 * @param {number|null|undefined} num - Amount in major units.
 * @returns {string}
 */
export const formatFullCurrency = (num) => formatCurrency(num);

/**
 * Compact short-form for chart axes and tight KPI tiles, banking convention:
 * K/M/B/T, one decimal max, dropped when whole (e.g. `"12M"` not `"12.0M"`).
 * Use {@link formatCurrency} where precision matters.
 * @param {number|null|undefined} num - Amount in major units.
 * @returns {string}
 */
export const formatCompactValue = (num) => {
  if (num === undefined || num === null) return '0';
  num = Math.round(num);
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const scale = (divisor, suffix) =>
    `${sign}${(absNum / divisor).toFixed(1).replace(/\.0$/, '')}${suffix}`;
  if (absNum >= 1e12) return scale(1e12, 'T');
  if (absNum >= 1e9) return scale(1e9, 'B');
  if (absNum >= 1e6) return scale(1e6, 'M');
  if (absNum >= 1e3) return scale(1e3, 'K');
  return `${sign}${absNum.toLocaleString()}`;
};

/**
 * Currency-prefixed compact form (symbol + {@link formatCompactValue}).
 * @param {number|null|undefined} num - Amount in major units.
 * @returns {string} e.g. `"Rs.12M"`.
 */
export const formatCompactCurrency = (num) =>
  `${getCurrencySymbol()}${formatCompactValue(num)}`;

/**
 * Format a date for display. Default matches the app-wide convention
 * (`"14 Jun 2026"`, Asia/Karachi via the process TZ on the server / browser
 * locale on the client).
 * @param {Date|string|number|null|undefined} date
 * @param {'short'|'long'|'numeric'} [variant='short'] - Output style.
 * @returns {string} Formatted date, or `'N/A'` for falsy input.
 */
export const formatDate = (date, variant = 'short') => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'N/A';
  if (variant === 'numeric') {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  if (variant === 'long') {
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date with time, e.g. `"14 Jun 2026, 03:45 PM"`.
 * @param {Date|string|number|null|undefined} date
 * @returns {string} Formatted datetime, or `'N/A'` for falsy input.
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Relative "time ago" label for notifications and activity feeds.
 * Falls back to an absolute date past one week.
 * @param {Date|string|number|null|undefined} date
 * @returns {string} e.g. `"Just now"`, `"5 min ago"`, `"2 hrs ago"`, `"3 days ago"`.
 */
export const formatNotificationTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 0) return 'Just now';
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return formatDate(d);
};

/**
 * Format a CNIC as `00000-0000000-0` while the user types.
 * @param {string} value - Raw or partial CNIC input.
 * @returns {string} Masked CNIC (only the digits entered so far).
 */
export const formatCNIC = (value) => {
  if (!value) return '';
  const rawValue = String(value).replace(/\D/g, '').slice(0, 13);
  if (rawValue.length > 12) {
    return `${rawValue.slice(0, 5)}-${rawValue.slice(5, 12)}-${rawValue.slice(12)}`;
  }
  if (rawValue.length > 5) {
    return `${rawValue.slice(0, 5)}-${rawValue.slice(5)}`;
  }
  return rawValue;
};

/**
 * Format a Pakistani mobile number as `+92 3XX XXXXXXX`. Accepts the common
 * input variants (`03XXXXXXXXX`, `3XXXXXXXXX`, `+923XXXXXXXXX`). Input that
 * doesn't look like a PK mobile number is returned trimmed, unchanged.
 * @param {string} value - Raw phone input.
 * @returns {string}
 */
export const formatPhoneNumber = (value) => {
  if (!value) return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('92')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  // A valid PK mobile subscriber number is 10 digits starting with 3.
  if (digits.length !== 10 || !digits.startsWith('3')) {
    return String(value).trim();
  }
  return `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
};

/**
 * Normalise an account number for display. Pre-formatted numbers (containing
 * a separator) are returned as-is; bare digit strings are grouped in fours.
 * @param {string} value - Raw account number.
 * @returns {string}
 */
export const formatAccountNumber = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  if (/[-\s]/.test(str)) return str;
  return str.replace(/(.{4})/g, '$1 ').trim();
};
