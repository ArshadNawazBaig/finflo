/**
 * hooks/useApi — standardized GET-on-mount fetch lifecycle. Covers the cold
 * fetch, the immediate:false deferral, the error path (error state + toast),
 * the `select` transform, and the core guarantee: a superseded (aborted)
 * response must not clobber a newer one.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: { get } }));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

import useApi from '@/hooks/useApi';

beforeEach(() => {
  get.mockReset();
  toastError.mockReset();
  get.mockResolvedValue({ data: { value: 42 } });
});

describe('useApi', () => {
  it('fetches on mount and exposes data with loading cleared', async () => {
    const { result } = renderHook(() => useApi('/resource'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(get).toHaveBeenCalledWith(
      '/resource',
      expect.objectContaining({ signal: expect.any(Object) }),
    );
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBe(null);
  });

  it('does not fetch when immediate is false until refetch is called', async () => {
    const { result } = renderHook(() => useApi('/resource', { immediate: false }));
    expect(result.current.loading).toBe(false);
    expect(get).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refetch();
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ value: 42 });
  });

  it('sets error state and toasts on failure', async () => {
    get.mockRejectedValueOnce({ response: { data: { message: 'Boom' } } });
    const { result } = renderHook(() => useApi('/resource'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(toastError).toHaveBeenCalledWith('Boom');
  });

  it('suppresses the error toast when showErrorToast is false', async () => {
    get.mockRejectedValueOnce({ response: { data: { message: 'Quiet' } } });
    const { result } = renderHook(() =>
      useApi('/resource', { showErrorToast: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('applies the select transform to the stored data', async () => {
    get.mockResolvedValueOnce({ data: { data: [1, 2, 3] } });
    const { result } = renderHook(() =>
      useApi('/resource', { select: (d) => d.data }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
  });

  it('does not let a superseded response clobber a newer one', async () => {
    let resolveFirst;
    get
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveFirst = () => res({ data: { v: 'stale' } });
          }),
      )
      .mockResolvedValueOnce({ data: { v: 'fresh' } });

    const { result } = renderHook(() => useApi('/race'));

    // Mount kicks off request #1 (still pending). Fire #2, which aborts #1.
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toEqual({ v: 'fresh' });

    // Now the superseded request #1 finally resolves — it must be ignored.
    await act(async () => {
      resolveFirst();
      await Promise.resolve();
    });
    expect(result.current.data).toEqual({ v: 'fresh' });
  });
});
