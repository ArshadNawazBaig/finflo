// Phone-number normalisation to E.164 for SMS. Defaults to Pakistan (+92) for
// local formats, since that's the operating market. Returns null when it can't
// form a plausible E.164 number so callers skip the send rather than ship junk.
const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || '92';

const normalizePhone = (raw, countryCode = DEFAULT_COUNTRY_CODE) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // Already E.164 (+CC...).
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 8 ? `+${digits}` : null;
  }

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // 00 international prefix → strip to bare international number.
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
    return digits.length >= 8 ? `+${digits}` : null;
  }

  // Local trunk prefix (e.g. PK 03001234567) → drop the 0, prepend country code.
  if (digits.startsWith('0')) {
    return `+${countryCode}${digits.slice(1)}`;
  }

  // Already includes the country code (e.g. 923001234567).
  if (digits.startsWith(countryCode) && digits.length > countryCode.length + 6) {
    return `+${digits}`;
  }

  // Bare national number → prepend country code.
  return `+${countryCode}${digits}`;
};

module.exports = { normalizePhone, DEFAULT_COUNTRY_CODE };
