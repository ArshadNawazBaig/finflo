/**
 * hooks/useTransactionPin — gates a sensitive member action behind PIN
 * verification, caching a verified token in memory (5min, 5s safety buffer).
 * Covers: cached-token fast path, prompt-to-set when no PIN, verify modal when
 * a PIN exists, token expiry, and clearToken.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Drive the PIN-status endpoint from the test.
const get = vi.fn();
vi.mock('@/lib/axios', () => ({ default: { get: (...a) => get(...a) } }));

import useTransactionPin from '@/hooks/useTransactionPin';

beforeEach(() => get.mockReset());

describe('useTransactionPin', () => {
  it('runs onSuccess immediately when a valid token is cached', async () => {
    const { result } = renderHook(() => useTransactionPin());

    act(() => result.current.onPinVerified('tok-123', 300)); // cache for 300s
    const onSuccess = vi.fn();
    await act(async () => {
      await result.current.requirePin(onSuccess);
    });

    expect(onSuccess).toHaveBeenCalledWith('tok-123');
    expect(result.current.showPinModal).toBe(false);
    expect(get).not.toHaveBeenCalled(); // never hit the status endpoint
  });

  it('opens the set-PIN modal when the member has no PIN', async () => {
    get.mockResolvedValue({ data: { hasPinSet: false } });
    const { result } = renderHook(() => useTransactionPin());

    await act(async () => {
      await result.current.requirePin(vi.fn());
    });

    expect(result.current.showSetPinModal).toBe(true);
    expect(result.current.showPinModal).toBe(false);
  });

  it('opens the verify modal when a PIN is already set', async () => {
    get.mockResolvedValue({ data: { hasPinSet: true } });
    const { result } = renderHook(() => useTransactionPin());

    await act(async () => {
      await result.current.requirePin(vi.fn());
    });

    expect(result.current.showPinModal).toBe(true);
    expect(result.current.showSetPinModal).toBe(false);
  });

  it('treats an expired cached token as absent', async () => {
    get.mockResolvedValue({ data: { hasPinSet: true } });
    const { result } = renderHook(() => useTransactionPin());

    // expiresIn 4s minus the 5s buffer => already expired on read.
    act(() => result.current.onPinVerified('stale', 4));
    expect(result.current.getValidToken()).toBe(null);

    await act(async () => {
      await result.current.requirePin(vi.fn());
    });
    expect(result.current.showPinModal).toBe(true); // had to re-verify
  });

  it('clearToken drops the cached token', () => {
    const { result } = renderHook(() => useTransactionPin());
    act(() => result.current.onPinVerified('tok', 300));
    expect(result.current.getValidToken()).toBe('tok');
    act(() => result.current.clearToken());
    expect(result.current.getValidToken()).toBe(null);
  });
});
