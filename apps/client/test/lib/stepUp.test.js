/**
 * lib/stepUp — in-memory step-up proof cache + the single-flight modal bridge
 * (window `stepup:required` event) that the axios interceptor drives.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStepUpToken,
  setStepUpToken,
  clearStepUpToken,
  requestStepUp,
} from '@/lib/stepUp';

beforeEach(() => {
  clearStepUpToken();
});

describe('step-up token cache', () => {
  it('returns null when empty', () => {
    expect(getStepUpToken()).toBeNull();
  });

  it('returns a token within its TTL and null once expired', () => {
    setStepUpToken('tok', 900);
    expect(getStepUpToken()).toBe('tok');
    // expiresIn 0 → expiry = now - 5s buffer → already stale
    setStepUpToken('tok2', 0);
    expect(getStepUpToken()).toBeNull();
  });

  it('clearStepUpToken drops it', () => {
    setStepUpToken('tok', 900);
    clearStepUpToken();
    expect(getStepUpToken()).toBeNull();
  });
});

describe('requestStepUp', () => {
  it('dispatches stepup:required and resolves (and caches) when the handler resolves', async () => {
    let detail;
    window.addEventListener(
      'stepup:required',
      (e) => {
        detail = e.detail;
      },
      { once: true },
    );

    const p = requestStepUp('password');
    expect(detail.factor).toBe('password');

    detail.resolve('proof-tok', 900);
    await expect(p).resolves.toBe('proof-tok');
    expect(getStepUpToken()).toBe('proof-tok');
  });

  it('rejects when the handler rejects (user cancelled)', async () => {
    window.addEventListener(
      'stepup:required',
      (e) => e.detail.reject(new Error('nope')),
      { once: true },
    );
    await expect(requestStepUp('password')).rejects.toThrow('nope');
  });

  it('short-circuits to a cached token without opening a modal', async () => {
    setStepUpToken('cached', 900);
    const spy = vi.fn();
    window.addEventListener('stepup:required', spy, { once: true });
    await expect(requestStepUp('password')).resolves.toBe('cached');
    expect(spy).not.toHaveBeenCalled();
    window.removeEventListener('stepup:required', spy);
  });

  it('single-flights concurrent callers onto one modal', async () => {
    const details = [];
    const handler = (e) => details.push(e.detail);
    window.addEventListener('stepup:required', handler);

    const p1 = requestStepUp('2fa');
    const p2 = requestStepUp('2fa');
    expect(details).toHaveLength(1); // one modal serves both

    details[0].resolve('shared', 900);
    await expect(Promise.all([p1, p2])).resolves.toEqual(['shared', 'shared']);
    window.removeEventListener('stepup:required', handler);
  });
});
