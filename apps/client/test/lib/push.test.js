/**
 * lib/push — native push-notification registration.
 *
 * In jsdom there is no Capacitor native platform, so IS_NATIVE is false and the
 * whole module must be inert: no axios calls, no dynamic import of the native
 * plugin. These tests pin that web-safe no-op contract (the part that actually
 * ships in the web bundle and runs in CI); the on-device path is exercised
 * manually on a real APK.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: { post } }));

// Spy on the native plugin import so we can assert it's never pulled in on web.
const addListener = vi.fn();
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    addListener,
    register: vi.fn(),
    requestPermissions: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

import { registerPush, unregisterPush } from '@/lib/push';

beforeEach(() => {
  post.mockReset();
  addListener.mockReset();
  localStorage.clear();
});

describe('registerPush (web / non-native)', () => {
  it('is a no-op: no token POST and no native listeners', async () => {
    await registerPush();
    await registerPush({ isStaff: true });

    expect(post).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    await expect(registerPush()).resolves.toBeUndefined();
  });
});

describe('unregisterPush (web / non-native)', () => {
  it('is a no-op: no unregister POST', async () => {
    localStorage.setItem('finflo_push_token', 'stale-token');
    await unregisterPush();

    expect(post).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    await expect(unregisterPush({ isStaff: true })).resolves.toBeUndefined();
  });
});
