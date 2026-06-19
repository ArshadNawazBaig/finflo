/**
 * atoms.userAtom storage — web XSS hardening. The business user's access token is
 * held in the in-memory atom but NEVER written to localStorage; the rest of the
 * profile persists as before. (jsdom reports non-native, i.e. the web code path.)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultStore } from 'jotai';
import { userAtom, memberAtom } from '@/atoms';

const store = getDefaultStore();

beforeEach(() => {
  localStorage.clear();
  store.set(userAtom, null);
  store.set(memberAtom, null);
});

describe('userAtom storage (web token hardening)', () => {
  it('keeps the token in memory but strips it from localStorage', () => {
    store.set(userAtom, {
      _id: '1',
      name: 'acme',
      permissions: ['*'],
      token: 'SECRET',
    });

    // In-memory atom still carries the token (Bearer / socket use it this session).
    expect(store.get(userAtom).token).toBe('SECRET');

    // Persisted copy has the profile but NOT the token.
    const persisted = JSON.parse(localStorage.getItem('user'));
    expect(persisted).toMatchObject({
      _id: '1',
      name: 'acme',
      permissions: ['*'],
    });
    expect(persisted.token).toBeUndefined();
  });

  it('persists a tokenless user object unchanged', () => {
    store.set(userAtom, { _id: '2', name: 'beta' });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({
      _id: '2',
      name: 'beta',
    });
  });

  it('strips the token from the member object too (member parity)', () => {
    store.set(memberAtom, { _id: 'm1', name: 'mem', token: 'MSECRET' });

    expect(store.get(memberAtom).token).toBe('MSECRET'); // in memory
    const persisted = JSON.parse(localStorage.getItem('member'));
    expect(persisted).toMatchObject({ _id: 'm1', name: 'mem' });
    expect(persisted.token).toBeUndefined(); // not at rest
  });
});
