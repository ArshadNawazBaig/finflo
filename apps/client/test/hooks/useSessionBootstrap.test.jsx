/**
 * hooks/useSessionBootstrap — after a web reload the cached user has no in-memory
 * token (it isn't persisted; atomWithStorage re-hydrates from the token-stripped
 * localStorage on mount). The hook silently refreshes to re-mint one, and drops
 * the stale profile when the refresh fails. `@/lib/sessionRefresh` is mocked.
 *
 * We seed localStorage directly (not `atomValues`) because the userAtom's
 * onMount re-reads storage — which is precisely the reload state under test.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useAtomValue } from 'jotai';
import { renderWithProviders, screen } from '../helpers/render.jsx';
import { userAtom, memberAtom } from '@/atoms';
import useSessionBootstrap from '@/hooks/useSessionBootstrap';

const { refreshAccessToken } = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
}));
vi.mock('@/lib/sessionRefresh', () => ({ refreshAccessToken }));

const Probe = () => {
  useSessionBootstrap();
  const user = useAtomValue(userAtom);
  if (!user) return <div>nouser</div>;
  return <div>token:{user.token || 'none'}</div>;
};

const MemberProbe = () => {
  useSessionBootstrap();
  const member = useAtomValue(memberAtom);
  if (!member) return <div>nomember</div>;
  return <div>m:{member.token || 'none'}</div>;
};

const seedUser = (user) => localStorage.setItem('user', JSON.stringify(user));
const seedMember = (m) => localStorage.setItem('member', JSON.stringify(m));

// A structurally-valid member-typed JWT so decodeJwt routes the refreshed token
// onto the member atom (the bootstrap picks the atom by the token's `type`).
const b64url = (o) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const MEMBER_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${b64url({ type: 'member', exp: 9999999999 })}.sig`;

beforeEach(() => {
  refreshAccessToken.mockReset();
  localStorage.clear();
});

describe('useSessionBootstrap', () => {
  it('re-mints the in-memory token when a cached user has none', async () => {
    seedUser({ _id: '1', name: 'x' }); // tokenless profile = web reload state
    refreshAccessToken.mockResolvedValue('FRESH');

    renderWithProviders(<Probe />);

    await waitFor(() =>
      expect(screen.getByText('token:FRESH')).toBeInTheDocument(),
    );
    expect(refreshAccessToken).toHaveBeenCalled();
  });

  it('drops the stale profile on a definitive auth rejection (401 → dead session)', async () => {
    seedUser({ _id: '1', name: 'x' });
    refreshAccessToken.mockRejectedValue({ response: { status: 401 } });

    renderWithProviders(<Probe />);

    await waitFor(() => expect(screen.getByText('nouser')).toBeInTheDocument());
  });

  it('KEEPS the profile on a transient/network failure (no spurious logout)', async () => {
    seedUser({ _id: '1', name: 'x' });
    refreshAccessToken.mockRejectedValue(new Error('Network Error')); // no .response

    renderWithProviders(<Probe />);

    // Profile survives (tokenless); the httpOnly cookie still authenticates and
    // the axios interceptor handles a truly-dead session on the next API call.
    await waitFor(() =>
      expect(screen.getByText('token:none')).toBeInTheDocument(),
    );
  });

  it('does nothing when the user already has a token', async () => {
    seedUser({ _id: '1', name: 'x', token: 'EXISTING' });

    renderWithProviders(<Probe />);

    await waitFor(() =>
      expect(screen.getByText('token:EXISTING')).toBeInTheDocument(),
    );
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('re-mints a member token onto the member atom (member parity)', async () => {
    seedMember({ _id: 'm1', name: 'mem' });
    refreshAccessToken.mockResolvedValue(MEMBER_TOKEN);

    renderWithProviders(<MemberProbe />);

    await waitFor(() =>
      expect(screen.getByText(`m:${MEMBER_TOKEN}`)).toBeInTheDocument(),
    );
    expect(refreshAccessToken).toHaveBeenCalled();
  });
});
