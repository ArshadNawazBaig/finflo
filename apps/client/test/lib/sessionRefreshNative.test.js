/**
 * lib/sessionRefresh on NATIVE — Capacitor has no cookie jar, so the refresh
 * authenticates with the stored body token and persists the rotated one. We mock
 * IS_NATIVE=true and the native token store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
const { readRefreshToken, writeRefreshToken } = vi.hoisted(() => ({
  readRefreshToken: vi.fn(),
  writeRefreshToken: vi.fn(),
}));

vi.mock('axios', () => ({ default: { create: () => ({ post }) } }));
vi.mock('@/lib/constants', () => ({ IS_NATIVE: true, BACKEND_URL: '' }));
vi.mock('@/lib/nativeRefresh', () => ({ readRefreshToken, writeRefreshToken }));

import { refreshAccessToken } from '@/lib/sessionRefresh';

beforeEach(() => {
  post.mockReset();
  readRefreshToken.mockReset();
  writeRefreshToken.mockReset();
});

describe('refreshAccessToken (native body-token flow)', () => {
  it('sends the stored refresh token in the request body', async () => {
    readRefreshToken.mockReturnValue('STORED_RT');
    post.mockResolvedValue({ data: { token: 'NEW', refreshToken: 'ROTATED' } });

    await expect(refreshAccessToken()).resolves.toBe('NEW');
    expect(post).toHaveBeenCalledWith(
      '/auth/refresh',
      { refreshToken: 'STORED_RT' },
      expect.any(Object),
    );
  });

  it('persists the rotated refresh token returned by the server', async () => {
    readRefreshToken.mockReturnValue('STORED_RT');
    post.mockResolvedValue({ data: { token: 'NEW', refreshToken: 'ROTATED' } });

    await refreshAccessToken();
    expect(writeRefreshToken).toHaveBeenCalledWith('ROTATED');
  });

  it('still resolves (and writes nothing) when the server omits a rotated token', async () => {
    readRefreshToken.mockReturnValue('STORED_RT');
    post.mockResolvedValue({ data: { token: 'NEW' } });

    await expect(refreshAccessToken()).resolves.toBe('NEW');
    expect(writeRefreshToken).not.toHaveBeenCalled();
  });
});
