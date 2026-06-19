import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { userAtom } from '@/atoms';
import { IS_APP_DOMAIN, IS_DEV } from '@/lib/constants';
import { clearRefreshToken } from '@/lib/nativeRefresh';

/**
 * Best-effort clear of the parent-domain auth cookie that App.jsx mirrors so
 * the cross-domain landing page can read login state. Mirrors the guard in
 * App.jsx (only meaningful on the production app domain). Harmless elsewhere.
 * @param {'business'|'member'} kind
 */
const clearCrossDomainCookie = (kind) => {
  if (IS_DEV || !IS_APP_DOMAIN) return;
  const name = kind === 'member' ? 'finflo_member_auth' : 'finflo_business_auth';
  document.cookie = `${name}=; domain=.finflo.org; path=/; max-age=0; secure; samesite=lax`;
};

/**
 * Unified logout for both identity systems (business users and members).
 *
 * Business users: clear `userAtom` + storage, then client-side navigate to
 * `/login` (SPA transition is safe — no module is being torn down).
 *
 * Members: hit the server logout endpoint (best-effort), then clear storage and
 * hard-navigate. We intentionally do NOT call `setMember(null)` first: that
 * triggers a synchronous re-render which tries to lazy-load MemberLogin while
 * `window.location.href` is already tearing the page down, producing
 * "Importing a module script failed" (documented in MemberSidebar).
 *
 * @returns {(options?: { type?: 'user'|'member', silent?: boolean, redirect?: string }) => Promise<void>}
 *   `logout()` — pass `{ type: 'member' }` from the member portal.
 *
 * @example
 * const logout = useLogout();
 * <button onClick={() => logout()}>Logout</button>            // business
 * <button onClick={() => logout({ type: 'member' })}>Logout</button> // member
 */
export function useLogout() {
  const navigate = useNavigate();
  const setUser = useSetAtom(userAtom);

  return useCallback(
    async ({ type = 'user', silent = false, redirect } = {}) => {
      if (type === 'member') {
        try {
          await api.post('/member-auth/logout');
        } catch {
          // Proceed with client-side cleanup regardless of server response.
        }
        localStorage.removeItem('member');
        clearRefreshToken(); // native: drop the secure-stored refresh token
        clearCrossDomainCookie('member');
        if (!silent) toast.success('Logged out successfully');
        // Hard nav avoids the lazy-load teardown race (see docstring).
        window.location.href = redirect || '/member/login';
        return;
      }

      localStorage.removeItem('user');
      setUser(null);
      clearRefreshToken(); // native: drop the secure-stored refresh token
      clearCrossDomainCookie('business');
      if (!silent) toast.success('Logged out successfully');
      navigate(redirect || '/login');
    },
    [navigate, setUser],
  );
}

export default useLogout;
