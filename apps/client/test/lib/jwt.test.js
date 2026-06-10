/** lib/jwt — client-side token decode + expiry pre-check (server still verifies). */
import { describe, it, expect } from 'vitest';
import { decodeJwt, isTokenExpired } from '@/lib/jwt';

const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeToken = (payload) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.sig`;

describe('decodeJwt', () => {
  it('decodes the payload of a well-formed token', () => {
    const token = makeToken({ sub: '123', role: 'admin' });
    expect(decodeJwt(token)).toMatchObject({ sub: '123', role: 'admin' });
  });

  it('returns null for malformed / empty input', () => {
    expect(decodeJwt('')).toBe(null);
    expect(decodeJwt('only.two')).toBe(null);
    expect(decodeJwt(null)).toBe(null);
  });
});

describe('isTokenExpired', () => {
  it('is true for an expired token, false for a fresh one', () => {
    expect(isTokenExpired(makeToken({ exp: Math.floor(Date.now() / 1000) - 10 }))).toBe(true);
    expect(isTokenExpired(makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 }))).toBe(false);
  });

  it('treats a missing exp as not expired, and bad tokens as expired', () => {
    expect(isTokenExpired(makeToken({ sub: 'x' }))).toBe(false);
    expect(isTokenExpired('garbage')).toBe(true);
    expect(isTokenExpired(null)).toBe(true);
  });
});
