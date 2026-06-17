/**
 * lib/nativeRefresh — native refresh-token storage backed by the OS secure
 * enclave (@aparajita/capacitor-secure-storage). IS_NATIVE and the plugin are
 * mocked; we assert the read/write/clear map onto the plugin + are best-effort.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { getItem, setItem, remove } = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/lib/constants', () => ({ IS_NATIVE: true }));
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: { getItem, setItem, remove },
}));

import {
  readRefreshToken,
  writeRefreshToken,
  clearRefreshToken,
} from '@/lib/nativeRefresh';

const KEY = 'finflo.refreshToken';

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
  remove.mockReset();
});

describe('nativeRefresh (secure storage)', () => {
  it('reads the token from secure storage', async () => {
    getItem.mockResolvedValue('RT');
    await expect(readRefreshToken()).resolves.toBe('RT');
    expect(getItem).toHaveBeenCalledWith(KEY);
  });

  it('returns null when nothing is stored', async () => {
    getItem.mockResolvedValue(null);
    await expect(readRefreshToken()).resolves.toBeNull();
  });

  it('writes the token to secure storage', async () => {
    setItem.mockResolvedValue(undefined);
    await writeRefreshToken('NEW');
    expect(setItem).toHaveBeenCalledWith(KEY, 'NEW');
  });

  it('does not write an empty/falsy token', async () => {
    await writeRefreshToken('');
    await writeRefreshToken(null);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clears the token from secure storage', async () => {
    remove.mockResolvedValue(true);
    await clearRefreshToken();
    expect(remove).toHaveBeenCalledWith(KEY);
  });

  it('is best-effort — a storage error never throws into the auth flow', async () => {
    getItem.mockRejectedValue(new Error('keychain locked'));
    await expect(readRefreshToken()).resolves.toBeNull();
    setItem.mockRejectedValue(new Error('keychain locked'));
    await expect(writeRefreshToken('x')).resolves.toBeUndefined();
  });
});
