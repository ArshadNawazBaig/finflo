/**
 * lib/appLock — the native-shell app-lock gate. Unlock state lives in
 * sessionStorage (auto-clears on a Capacitor force-quit), and locking is
 * restricted to native platforms so desktop tab-switches never re-lock.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Drive Capacitor.isNativePlatform from the test so we can assert both shells.
const isNativePlatform = vi.fn();
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}));

import {
  isAppLockPlatform,
  markAppUnlocked,
  clearAppUnlocked,
  isAppUnlocked,
} from '@/lib/appLock';

beforeEach(() => {
  sessionStorage.clear();
  isNativePlatform.mockReset();
});

describe('isAppLockPlatform', () => {
  it('locks only on native platforms', () => {
    isNativePlatform.mockReturnValue(true);
    expect(isAppLockPlatform()).toBe(true);
    isNativePlatform.mockReturnValue(false);
    expect(isAppLockPlatform()).toBe(false);
  });
});

describe('unlock state', () => {
  it('starts locked (no unlock flag)', () => {
    expect(isAppUnlocked()).toBe(false);
  });

  it('marks and reads back an unlock', () => {
    markAppUnlocked();
    expect(isAppUnlocked()).toBe(true);
  });

  it('clears the unlock flag (re-locks)', () => {
    markAppUnlocked();
    clearAppUnlocked();
    expect(isAppUnlocked()).toBe(false);
  });
});
