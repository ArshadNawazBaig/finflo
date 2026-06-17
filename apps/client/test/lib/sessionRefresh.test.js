/**
 * lib/sessionRefresh — the silent access-token refresh used by the axios auth
 * interceptors. Verifies it echoes the CSRF cookie, extracts the token from both
 * enveloped and raw bodies, and is single-flight (a burst of callers triggers one
 * network round-trip).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('axios', () => ({ default: { create: () => ({ post }) } }));

import { refreshAccessToken } from '@/lib/sessionRefresh';

const clearCsrf = () => {
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

beforeEach(() => {
  post.mockReset();
  clearCsrf();
});

describe('refreshAccessToken', () => {
  it('returns the token from an enveloped response', async () => {
    post.mockResolvedValue({
      data: { success: true, data: { token: 'NEW', csrfToken: 'c' } },
    });
    await expect(refreshAccessToken()).resolves.toBe('NEW');
    expect(post).toHaveBeenCalledWith('/auth/refresh', {}, expect.any(Object));
  });

  it('returns the token from a raw (non-enveloped) response', async () => {
    post.mockResolvedValue({ data: { token: 'RAW' } });
    await expect(refreshAccessToken()).resolves.toBe('RAW');
  });

  it('echoes the csrf_token cookie in the x-csrf-token header', async () => {
    document.cookie = 'csrf_token=abc123; path=/';
    post.mockResolvedValue({ data: { token: 'T' } });

    await refreshAccessToken();

    const [, , config] = post.mock.calls[0];
    expect(config.headers['x-csrf-token']).toBe('abc123');
  });

  it('omits the csrf header when no cookie is present', async () => {
    post.mockResolvedValue({ data: { token: 'T' } });
    await refreshAccessToken();
    const [, , config] = post.mock.calls[0];
    expect(config.headers['x-csrf-token']).toBeUndefined();
  });

  it('is single-flight: concurrent callers share one request', async () => {
    let resolve;
    post.mockReturnValue(new Promise((r) => { resolve = r; }));

    const a = refreshAccessToken();
    const b = refreshAccessToken();
    expect(post).toHaveBeenCalledTimes(1);

    resolve({ data: { token: 'SHARED' } });
    await expect(a).resolves.toBe('SHARED');
    await expect(b).resolves.toBe('SHARED');
  });

  it('rejects when the response carries no token', async () => {
    post.mockResolvedValue({ data: {} });
    await expect(refreshAccessToken()).rejects.toThrow(/token/i);
  });

  it('propagates a network/HTTP failure', async () => {
    post.mockRejectedValue(new Error('401'));
    await expect(refreshAccessToken()).rejects.toThrow();
  });

  it('clears its in-flight slot so a later refresh starts fresh', async () => {
    post.mockResolvedValue({ data: { token: 'FIRST' } });
    await refreshAccessToken();
    post.mockResolvedValue({ data: { token: 'SECOND' } });
    await expect(refreshAccessToken()).resolves.toBe('SECOND');
    expect(post).toHaveBeenCalledTimes(2);
  });
});
