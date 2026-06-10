/**
 * hooks/useSystemSettings — fetches system settings once, caches them at module
 * scope (5min TTL), and derives plan limits. Covers the cold fetch + limit
 * resolution (case-insensitive plan match, -1 → Infinity, 10 fallback) and the
 * warm-cache path that skips a second network call.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: { get } }));

import useSystemSettings from '@/hooks/useSystemSettings';

const SETTINGS = {
  subscriptionPlans: [
    { name: 'Pro', limits: { members: -1, loans: 50 } },
    { name: 'Free', limits: { members: 10 } },
  ],
};

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: SETTINGS });
});

describe('useSystemSettings', () => {
  it('fetches settings and resolves plan limits', async () => {
    const { result } = renderHook(() => useSystemSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getPlanSettings('pro')).toMatchObject({ name: 'Pro' });
    expect(result.current.getLimit('Pro', 'loans')).toBe(50);
    expect(result.current.getLimit('Pro', 'members')).toBe(Infinity); // -1 means unlimited
    expect(result.current.getLimit('Nonexistent', 'loans')).toBe(10); // missing-plan fallback
    expect(result.current.getLimit('Free', 'unknownField')).toBeUndefined(); // missing field
  });

  it('serves the warm module cache without re-fetching', async () => {
    // The previous test populated the 5-minute module cache, so this render
    // should hydrate synchronously and make no new network call.
    const { result } = renderHook(() => useSystemSettings());
    expect(result.current.loading).toBe(false);
    expect(result.current.settings).toMatchObject(SETTINGS);
    expect(get).not.toHaveBeenCalled();
  });
});
