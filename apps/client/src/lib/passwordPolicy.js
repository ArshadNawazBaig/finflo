// Client mirror of the server password policy
// (apps/server/src/utils/validation.js). Keep the regex IN SYNC with the server —
// the server is the real enforcement boundary; this drives UX (inline validation
// + the requirements checklist) so users get instant feedback.
//
// Policy: at least 8 characters, with 1 uppercase letter, 1 number, and 1 special
// character (one of @ $ ! % * ? & . _ -).
export const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;

// Short hint for placeholders / helper text.
export const PASSWORD_HINT =
  'Min 8 chars · 1 uppercase · 1 number · 1 special character';

// Full sentence used as the validation error (matches the server message).
export const PASSWORD_ERROR =
  'Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character.';

export const isPasswordValid = (password) => PASSWORD_REGEX.test(password || '');

// `{ isValid, message }` — same shape as the server's validatePassword.
export const validatePassword = (password) =>
  isPasswordValid(password)
    ? { isValid: true, message: '' }
    : { isValid: false, message: PASSWORD_ERROR };

// Per-requirement breakdown for a live checklist UI.
export const passwordChecks = (password = '') => [
  { label: 'At least 8 characters', met: password.length >= 8 },
  { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
  { label: 'One number', met: /\d/.test(password) },
  { label: 'One special character (@ $ ! % * ? & . _ -)', met: /[@$!%*?&._-]/.test(password) },
];

// Real-time strength derived from how many of the policy rules are satisfied
// (0–4), for a progress-bar UI. The bar fills and turns green only once the
// password meets the full policy (all four rules). Tailwind class names are
// returned so the bar/label colours stay theme-aware.
export const getPasswordStrength = (password = '') => {
  if (!password) {
    return { score: 0, percent: 0, label: '', barClass: 'bg-transparent', textClass: '' };
  }
  const met = passwordChecks(password).filter((c) => c.met).length;
  const TIERS = [
    { percent: 12, label: 'Weak', barClass: 'bg-rose-500', textClass: 'text-rose-500' }, // 0
    { percent: 25, label: 'Weak', barClass: 'bg-rose-500', textClass: 'text-rose-500' }, // 1
    { percent: 50, label: 'Fair', barClass: 'bg-orange-500', textClass: 'text-orange-500' }, // 2
    { percent: 75, label: 'Good', barClass: 'bg-amber-500', textClass: 'text-amber-500' }, // 3
    { percent: 100, label: 'Strong', barClass: 'bg-emerald-500', textClass: 'text-emerald-500' }, // 4
  ];
  return { score: met, ...TIERS[Math.min(met, 4)] };
};
