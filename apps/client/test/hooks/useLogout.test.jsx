/**
 * hooks/useLogout — unified logout for both identity systems.
 * Business users: clear the user atom + storage, then SPA-navigate to /login.
 * Members: POST /member-auth/logout (best-effort), clear storage, hard-nav to
 * /member/login (no atom reset — avoids the lazy-load teardown race).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const navigate = vi.hoisted(() => vi.fn());
const setUser = vi.hoisted(() => vi.fn());
const post = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigate,
}));
vi.mock('jotai', async (orig) => ({
  ...(await orig()),
  useSetAtom: () => setUser,
}));
vi.mock('@/lib/axios', () => ({ default: { post: (...a) => post(...a) } }));
vi.mock('sonner', () => ({ toast: { success: (...a) => toastSuccess(...a) } }));

import { useLogout } from '@/hooks/useLogout';

const realLocation = window.location;

beforeEach(() => {
  navigate.mockReset();
  setUser.mockReset();
  post.mockReset().mockResolvedValue({});
  toastSuccess.mockReset();
  localStorage.clear();
  // Replace window.location so the member hard-nav doesn't trigger jsdom's
  // "Not implemented: navigation" and is observable.
  delete window.location;
  window.location = { href: '' };
});

afterEach(() => {
  window.location = realLocation;
});

describe('useLogout (business user)', () => {
  it('clears the user atom + storage, toasts, and navigates to /login', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current();
    });

    expect(setUser).toHaveBeenCalledWith(null);
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled(); // business logout hits no endpoint
  });

  it('respects a custom redirect and silent mode', async () => {
    const { result } = renderHook(() => useLogout());
    await act(async () => {
      await result.current({ silent: true, redirect: '/goodbye' });
    });
    expect(navigate).toHaveBeenCalledWith('/goodbye');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe('useLogout (member)', () => {
  it('calls the logout endpoint, clears storage, and hard-navigates', async () => {
    localStorage.setItem('member', JSON.stringify({ id: 2 }));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current({ type: 'member' });
    });

    expect(post).toHaveBeenCalledWith('/member-auth/logout');
    expect(localStorage.getItem('member')).toBeNull();
    expect(window.location.href).toBe('/member/login');
    expect(setUser).not.toHaveBeenCalled(); // no atom reset on the member path
  });

  it('proceeds with cleanup even if the endpoint fails', async () => {
    post.mockRejectedValueOnce(new Error('network'));
    localStorage.setItem('member', JSON.stringify({ id: 3 }));
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current({ type: 'member' });
    });

    expect(localStorage.getItem('member')).toBeNull();
    expect(window.location.href).toBe('/member/login');
  });
});
