import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'guerrillamail.com',
  'temp-mail.org',
  '10minutemail.com',
  'discard.email',
  'getairmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'spam4.me',
  'grr.la',
  'guerrillamail.de',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com',
  'maildrop.cc',
  'burners-email.com',
  'fake-email.com',
];

export const validateEmail = (email) => {
  if (!email) return { isValid: false, message: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return { isValid: false, message: 'Invalid email format' };
  const domain = email.toLowerCase().split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { isValid: false, message: 'Disposable emails are not allowed' };
  }
  return { isValid: true };
};

export const passwordRegex =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

export const validatePassword = (password) => {
  if (!password || !passwordRegex.test(password)) {
    return {
      isValid: false,
      message:
        'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.',
    };
  }
  return { isValid: true };
};

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getCurrencySymbol = () => {
  try {
    // Check admin/staff user object first
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.currency) return user.currency;
    }
    // Check member object
    const memberStr = localStorage.getItem('memberData');
    if (memberStr) {
      const member = JSON.parse(memberStr);
      if (member?.currency) return member.currency;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return 'Rs.';
};

// Money is stored to 2 dp (rupees + paisa). Show up to 2 decimals so paisa
// appear when present, without forcing a trailing ".00" on whole amounts.
const MONEY_FORMAT = { minimumFractionDigits: 0, maximumFractionDigits: 2 };

export const formatCurrency = (num) => {
  const symbol = getCurrencySymbol();
  if (num === undefined || num === null) return `${symbol}0`;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString(undefined, MONEY_FORMAT);
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
};
export const formatFullCurrency = (num) => {
  const symbol = getCurrencySymbol();
  if (num === undefined || num === null) return `${symbol}0`;
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString(undefined, MONEY_FORMAT);
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
};
// Compact short-form for chart axes and tight KPI tiles. Mirrors the
// banking convention: K for thousands, M for millions, B for billions,
// T for trillions. One decimal max, dropped when whole (e.g. "12M" not
// "12.0M"). Use the long-form `formatCurrency` in tooltips/detail views
// where precision matters.
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

// Currency-prefixed compact form. Uses the active business currency from
// the user atom (same source `formatCurrency` reads), so the symbol stays
// consistent across the app.
export const formatCompactCurrency = (num) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const symbol = user.currency || user.business?.currency || 'Rs.';
  return `${symbol}${formatCompactValue(num)}`;
};

export const capitalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatCNIC = (value) => {
  if (!value) return '';
  const rawValue = value.replace(/\D/g, '').slice(0, 13);
  if (rawValue.length > 12) {
    return `${rawValue.slice(0, 5)}-${rawValue.slice(5, 12)}-${rawValue.slice(12)}`;
  }
  if (rawValue.length > 5) {
    return `${rawValue.slice(0, 5)}-${rawValue.slice(5)}`;
  }
  return rawValue;
};

/**
 * Validates and returns a safe redirection link based on the user's role.
 * Fallback to notifications page if the route is unauthorized.
 */
export const getSafeNotificationLink = (link, role) => {
  if (!link) return null;

  // 1. Member Role Logic
  if (role === 'member') {
    // Allow links starting with /member/ or exactly /member
    if (link.startsWith('/member/') || link === '/member') return link;

    // Explicitly allow general paths that members are allowed to see
    const memberAllowedPaths = [
      '/loans',
      '/repayments',
      '/savings',
      '/grantor-requests',
    ];
    if (memberAllowedPaths.some((path) => link.startsWith(path))) {
      // If the link is /loans but it should be /member/loans, transform it if necessary
      // However, usually these links should already be correct from backend.
      return link;
    }

    return link.startsWith('/') ? link : `/${link}`;
  }

  // 2. Admin / Staff / Super Admin Logic
  const validAdminRoles = ['super_admin', 'admin', 'staff', 'user'];
  if (validAdminRoles.includes(role)) {
    const isSuperAdmin = role === 'super_admin';

    // Super Admin: access to super-admin routes + general admin routes
    if (isSuperAdmin && link.startsWith('/super-admin')) return link;

    // Reject member routes for all non-member users
    if (link.startsWith('/member/') || link === '/member') {
      return isSuperAdmin ? '/super-admin/notifications' : '/notifications';
    }

    // Regular Admins/Staff: Reject super-admin routes
    if (!isSuperAdmin && link.startsWith('/super-admin')) {
      return '/notifications';
    }

    // Default: Allow general admin routes
    return link;
  }

  // Final Fallback for unknown roles or public routes
  return link;
};

/**
 * Robust clipboard copy utility.
 * Falls back to document.execCommand('copy') if navigator.clipboard is unavailable (e.g., HTTP environments or specific webviews).
 */
export const copyToClipboard = async (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to execCommand', err);
    }
  }

  // Fallback for older browsers or insecure contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed', err);
    return false;
  }
};

/**
 * Generates a standard 13-character account number based on business abbreviation and count
 * Format: [ABBR]-[100000+count][RANDOM]
 */
export const generateDynamicAccountNumber = (user, type = 'SAV') => {
  const typeInitial = String(type).charAt(0).toUpperCase();
  // Format: [ABBR]-[TYPE_INITIAL]-[COUNT][RANDOM] e.g. MLO-S-100001xxx
  const abbr = user?.businessAbbreviation
    ? `${user.businessAbbreviation.toUpperCase()}-${typeInitial}`
    : type.toUpperCase();

  const count = (user?.customerCount || 0) + 100001;
  const base = `${abbr}-${count}`;
  const remaining = 13 - base.length;

  let randomSuffix = '';
  if (remaining > 0) {
    for (let i = 0; i < remaining; i++) {
      randomSuffix += Math.floor(Math.random() * 10);
    }
  }

  return `${base}${randomSuffix}`;
};
