/**
 * lib/deviceId — a stable per-install id sent as X-Device-Id so the server can
 * keep one session row per device (re-login supersedes the same device's prior
 * session).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeviceId } from '@/lib/deviceId';

beforeEach(() => {
  localStorage.clear();
});

describe('getDeviceId', () => {
  it('returns a stable, non-empty id (same value on repeat calls)', () => {
    const id = getDeviceId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(getDeviceId()).toBe(id);
  });

  it('persists the generated id to localStorage', async () => {
    localStorage.clear();
    vi.resetModules(); // fresh module → clears the in-memory cache
    const { getDeviceId: fresh } = await import('@/lib/deviceId');
    const id = fresh();
    expect(localStorage.getItem('finflo_device_id')).toBe(id);
  });
});
