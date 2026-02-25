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

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatPKR = (num) => {
  if (num === undefined || num === null) return 'Rs. 0';
  num = Math.round(num);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  let formatted;
  if (absNum >= 1000000) {
    formatted = (absNum / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else {
    formatted = absNum.toLocaleString();
  }
  return `${isNegative ? '-' : ''}Rs. ${formatted}`;
};
export const formatCompactValue = (num) => {
  if (num === undefined || num === null) return '0';
  num = Math.round(num);
  const absNum = Math.abs(num);
  let formatted;
  if (absNum >= 1000000) {
    formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else {
    formatted = num.toLocaleString();
  }
  return formatted;
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
    if (link.startsWith('/member')) return link;
    return '/member/notifications';
  }

  // 2. Admin / Staff / Super Admin Logic
  const validAdminRoles = ['super_admin', 'admin', 'staff', 'user'];
  if (validAdminRoles.includes(role)) {
    const isSuperAdmin = role === 'super_admin';

    // Super Admin: access to super-admin routes + general admin routes
    if (isSuperAdmin && link.startsWith('/super-admin')) return link;

    // Reject member routes for all non-member users
    if (link.startsWith('/member')) {
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
