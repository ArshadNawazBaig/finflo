/**
 * components/RequireAuth — the primary business-side route guard. Lets
 * authenticated users through, bounces anonymous or expired-token users to
 * /login, and forces a password change when the user is flagged for one.
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

  it('redirects a user with an expired token to /login', () => {
    renderAt({ token: expiredToken(), role: 'admin' });
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('forces a password change when flagged', () => {
    renderAt({ token: freshToken(), role: 'admin', mustChangePassword: true });
    expect(screen.getByText('CHANGE PASSWORD')).toBeInTheDocument();
  });
});
