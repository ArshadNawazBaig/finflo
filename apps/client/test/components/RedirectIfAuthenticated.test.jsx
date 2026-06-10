/**
 * components/RedirectIfAuthenticated — wraps public/auth pages (login, landing)
 * and sends an already-logged-in user to their home: /super-admin for a
 * super_admin, /dashboard for everyone else. Anonymous users see the page.
 */
import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '../helpers/render.jsx';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';
import { userAtom } from '@/atoms';

const tree = (
  <Routes>
    <Route element={<RedirectIfAuthenticated />}>
      <Route path="/login" element={<div>LOGIN PAGE</div>} />
    </Route>
    <Route path="/dashboard" element={<div>ADMIN HOME</div>} />
    <Route path="/super-admin" element={<div>SUPER HOME</div>} />
  </Routes>
);

const renderAt = (user) =>
  renderWithProviders(tree, { route: '/login', atomValues: [[userAtom, user]] });

describe('RedirectIfAuthenticated', () => {
  it('shows the public page to an anonymous visitor', () => {
    renderAt(null);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('redirects a logged-in admin to the dashboard', () => {
    renderAt({ role: 'admin' });
    expect(screen.getByText('ADMIN HOME')).toBeInTheDocument();
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
  });

  it('redirects a logged-in super_admin to the super-admin home', () => {
    renderAt({ role: 'super_admin' });
    expect(screen.getByText('SUPER HOME')).toBeInTheDocument();
  });
});
