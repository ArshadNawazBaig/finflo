// Lightweight client-side JWT helpers. Trust the server for verification —
// these are only used to avoid firing requests with tokens we already know
// are expired, so the user gets a smooth redirect to /login instead of an
// error flash from a 401 race.

const base64UrlDecode = (segment) => {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (padded.length % 4)) % 4);
  return atob(padded + padding);
};

export const decodeJwt = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
};

// 30s skew buffer so we don't make a request that the server will reject in the
// next moment.
export const isTokenExpired = (token) => {
  const payload = decodeJwt(token);
  if (!payload) return true;
  if (!payload.exp) return false;
  return Date.now() >= payload.exp * 1000 - 30_000;
};
