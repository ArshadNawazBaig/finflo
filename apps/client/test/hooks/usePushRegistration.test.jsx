/**
 * hooks/usePushRegistration — registers for native push when a session becomes
 * authenticated, unregisters on logout/unmount.
 *
 * In jsdom IS_NATIVE is false, so the hook must stay inert: it must not call
 * registerPush/unregisterPush regardless of auth state. That web-safe contract
 * is what these tests pin (the native path is verified on-device).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { registerPush, unregisterPush } = vi.hoisted(() => ({
  registerPush: vi.fn(),
  unregisterPush: vi.fn(),
}));
vi.mock('@/lib/push', () => ({ registerPush, unregisterPush }));

import usePushRegistration from '@/hooks/usePushRegistration';

beforeEach(() => {
  registerPush.mockReset();
  unregisterPush.mockReset();
});

describe('usePushRegistration (web / non-native)', () => {
  it('does not register even when authenticated', () => {
    renderHook(() => usePushRegistration(true, false));
    expect(registerPush).not.toHaveBeenCalled();
  });

  it('does not unregister on unmount', () => {
    const { unmount } = renderHook(() => usePushRegistration(true, true));
    unmount();
    expect(unregisterPush).not.toHaveBeenCalled();
  });

  it('does nothing while unauthenticated', () => {
    renderHook(() => usePushRegistration(false, true));
    expect(registerPush).not.toHaveBeenCalled();
    expect(unregisterPush).not.toHaveBeenCalled();
  });
});
