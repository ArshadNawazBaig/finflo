/**
 * lib/sessionRevoke — decides whether a `session:revoked` socket event applies to
 * THIS device. The key case is the "log out others" bug: the kept device must
 * NOT re-validate (which would log it out), while genuinely-revoked devices do.
 */
import { describe, it, expect } from 'vitest';
import { isSessionRevokedForMe } from '@/lib/sessionRevoke';

describe('isSessionRevokedForMe', () => {
  it('revokedSids: re-validates only if my sid is in the list', () => {
    expect(isSessionRevokedForMe('A', { revokedSids: ['A', 'B'] })).toBe(true);
    expect(isSessionRevokedForMe('C', { revokedSids: ['A', 'B'] })).toBe(false);
  });

  it('keptSid: the kept device ignores it; others re-validate', () => {
    // THE BUG FIX: I am the kept/current device → do NOT log myself out.
    expect(isSessionRevokedForMe('A', { keptSid: 'A' })).toBe(false);
    expect(isSessionRevokedForMe('B', { keptSid: 'A' })).toBe(true);
  });

  it('no detail → full revocation / legacy → everyone re-validates', () => {
    expect(isSessionRevokedForMe('A', {})).toBe(true);
    expect(isSessionRevokedForMe('A')).toBe(true);
  });

  it('unknown sid → re-validate (safe default)', () => {
    expect(isSessionRevokedForMe(null, { keptSid: 'A' })).toBe(true);
    expect(isSessionRevokedForMe(null, { revokedSids: ['A'] })).toBe(true);
  });
});
