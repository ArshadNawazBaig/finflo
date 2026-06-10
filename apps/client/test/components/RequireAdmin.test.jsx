/**
 * components/RequireAdmin — the super-admin route guard. Renders the nested
 * <Outlet/> only for super_admin users; every other role (admin, staff,
 * anonymous) is redirected to /dashboard.
 */
import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '../helpers/render.jsx';
import RequireAdmin from '@/components/RequireAdmin';
import { userAtom } from '@/atoms';

const tree = (
  <Routes>
    <Route element={<RequireAdmin />}>
      <Route path="/super-admin" element={<div>SUPER PANEL</div>} />
    </Route>
    <Route path="/dashboard" element={<div>USER DASHBOARD</div>} />
  </Routes>
);

const renderAt = (user) =>
  renderWithProviders(tree, {
    route: '/super-admin',
    atomValues: [[userAtom, user]],
  });

describe('RequireAdmin', () => {
  it('renders the protected outlet for a super_admin', () => {
    renderAt({ role: 'super_admin' });
    expect(screen.getByText('SUPER PANEL')).toBeInTheDocument();
  });

  it('redirects an admin to the dashboard', () => {
    renderAt({ role: 'admin' });
    expect(screen.getByText('USER DASHBOARD')).toBeInTheDocument();
    expect(screen.queryByText('SUPER PANEL')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to the dashboard', () => {
    renderAt(null);
    expect(screen.getByText('USER DASHBOARD')).toBeInTheDocument();
  });
});
