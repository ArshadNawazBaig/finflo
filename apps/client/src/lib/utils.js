import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
