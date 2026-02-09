import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatPKR = (num) => {
  if (num === undefined || num === null) return 'Rs. 0';
  const absNum = Math.abs(num);
  let formatted = num;
  if (absNum >= 1000000) {
    formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (absNum >= 1000) {
    formatted = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    formatted = num.toLocaleString();
  }
  return `Rs. ${formatted}`;
};
export const formatCompactValue = (num) => {
  if (num === undefined || num === null) return '0';
  const absNum = Math.abs(num);
  let formatted = num;
  if (absNum >= 1000000) {
    formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (absNum >= 1000) {
    formatted = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
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
