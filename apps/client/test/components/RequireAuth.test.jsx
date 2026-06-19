/**
 * components/RequireAuth — the primary business-side route guard. Auth presence
 * keys off the cached user OBJECT (not the access token): authenticated users
 * pass, anonymous users bounce to /login, and a flagged user is forced to change
 * their password. Token EXPIRY is owned by the axios refresh interceptor, so an
 * expired/absent in-memory token alone no longer bounces (the token isn't
 * persisted on web; it's re-minted by a silent refresh on load).
 */
import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '../helpers/render.jsx';
import RequireAuth from '@/components/RequireAuth';
import { userAtom } from '@/atoms';

const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const makeToken = (payload) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.sig`;
const freshToken = () => makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
const expiredToken = () => makeToken({ exp: Math.floor(Date.now() / 1000) - 60 });

const tree = (
  <Routes>
    <Route element={<RequireAuth />}>
      <Route path="/dashboard" element={<div>PROTECTED</div>} />
    </Route>
    <Route path="/login" element={<div>LOGIN PAGE</div>} />
    <Route path="/force-password-change" element={<div>CHANGE PASSWORD</div>} />
  </Routes>
);

const renderAt = (user, route = '/dashboard') =>
  renderWithProviders(tree, { route, atomValues: [[userAtom, user]] });

describe('RequireAuth', () => {
  it('renders the protected outlet for a valid session', () => {
    renderAt({ token: freshToken(), role: 'admin' });
    expect(screen.getByText('PROTECTED')).toBeInTheDocument();
  });

  it('redirects an anonymous visitor to /login', () => {
    renderAt(null);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('still renders when the in-memory token is expired (refresh layer owns expiry)', () => {
    renderAt({ token: expiredToken(), role: 'admin' });
    expect(screen.getByText('PROTECTED')).toBeInTheDocument();
  });

  it('renders a web session that has no in-memory token (token not persisted, refreshed on load)', () => {
    renderAt({ role: 'admin' }); // user object present, token absent
    expect(screen.getByText('PROTECTED')).toBeInTheDocument();
  });

  it('forces a password change when flagged', () => {
    renderAt({ token: freshToken(), role: 'admin', mustChangePassword: true });
    expect(screen.getByText('CHANGE PASSWORD')).toBeInTheDocument();
  });
});
