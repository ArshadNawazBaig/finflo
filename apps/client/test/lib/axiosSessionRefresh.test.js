/**
 * lib/axios — silent-refresh interceptor wiring. Drives the REAL `api` instance
 * through a stubbed adapter (no network) with `@/lib/sessionRefresh` mocked, to
 * prove: a proactive refresh when the cached token is expired, a reactive
 * refresh+retry on a 401, single retry only (no loop), and a clean logout when
 * the refresh fails.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDefaultStore } from 'jotai';

const { refreshAccessToken } = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
}));
vi.mock('@/lib/sessionRefresh', () => ({ refreshAccessToken }));

import api from '@/lib/axios';
import { userAtom, isRedirectingAtom } from '@/atoms';

// Structurally-valid JWTs so the client-side isTokenExpired/decodeJwt see real
// payloads (type + exp). Only the payload segment is meaningful.
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const jwtOf = (payload) => `eyJhbGciOiJIUzI1NiJ9.${b64url(payload)}.sig`;
const nowSec = () => Math.floor(Date.now() / 1000);
const VALID_OLD = jwtOf({ type: 'user', exp: nowSec() + 3600 });
const VALID_NEW = jwtOf({ type: 'user', exp: nowSec() + 7200 });
const EXPIRED = jwtOf({ type: 'user', exp: nowSec() - 3600 });

const store = getDefaultStore();
let handler; // (config) => Promise<response> | rejects

const flush = async () => {
  // Drain microtasks across many turns — a refresh+retry chains through two
  // full async interceptor passes plus axios' internal promise hops.
  for (let i = 0; i < 60; i += 1) await Promise.resolve();
};

beforeEach(() => {
  refreshAccessToken.mockReset();
  store.set(userAtom, null);
  store.set(isRedirectingAtom, false);
  window.history.pushState({}, '', '/'); // non-auth, non-member route
  api.defaults.adapter = (config) => handler(config);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('axios silent-refresh', () => {
  it('proactively refreshes when the cached token is already expired', async () => {
    store.set(userAtom, { token: EXPIRED });
    refreshAccessToken.mockResolvedValue(VALID_NEW);
    handler = (config) =>
      Promise.resolve({ data: { ok: true }, status: 200, headers: {}, config });

    const res = await api.get('/x');

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(res.config.headers.Authorization).toBe(`Bearer ${VALID_NEW}`);
    expect(store.get(userAtom).token).toBe(VALID_NEW); // persisted onto the atom
  });

  it('refreshes + retries the original request on a 401', async () => {
    store.set(userAtom, { token: VALID_OLD });
    refreshAccessToken.mockResolvedValue(VALID_NEW);
    handler = (config) => {
      if (!config._sessionRetried) {
        return Promise.reject({
          response: { status: 401 },
          config,
          isAxiosError: true,
        });
      }
      return Promise.resolve({ data: { ok: true }, status: 200, headers: {}, config });
    };

    const res = await api.get('/x');

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(res.data).toEqual({ ok: true });
    expect(store.get(userAtom).token).toBe(VALID_NEW);
  });

  it('logs out (nulls the session) when the refresh fails on a 401', async () => {
    vi.useFakeTimers(); // freeze the 50ms redirect timer so jsdom never navigates
    store.set(userAtom, { token: VALID_OLD });
    refreshAccessToken.mockRejectedValue(new Error('session dead'));
    handler = (config) =>
      Promise.reject({ response: { status: 401 }, config, isAxiosError: true });

    api.get('/x').catch(() => {}); // never resolves; just trigger the pipeline
    await flush();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(store.get(userAtom)).toBeNull();
    expect(store.get(isRedirectingAtom)).toBe(true);
  });

  it('only retries once — a second 401 after refresh ends the session', async () => {
    store.set(userAtom, { token: VALID_OLD });
    refreshAccessToken.mockResolvedValue(VALID_NEW);
    const seen = [];
    handler = (config) => {
      seen.push(config._sessionRetried === true);
      return Promise.reject({ response: { status: 401 }, config, isAxiosError: true });
    };

    api.get('/x').catch(() => {});
    await flush();

    // first attempt (not retried) + one retry (retried) — then it stops
    expect(seen).toEqual([false, true]);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(store.get(userAtom)).toBeNull();
  });
});
