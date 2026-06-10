/**
 * components/RequirePaidPlan — gates paid-only features. Paid plans and
 * staff/managers pass; a Free-plan admin is sent to /billing with an upgrade
 * prompt, while a Free-plan non-admin is sent to /dashboard with an error.
 */
import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen } from '../helpers/render.jsx';
import RequirePaidPlan from '@/components/RequirePaidPlan';
import { userAtom } from '@/atoms';

const tree = (
  <Routes>
    <Route element={<RequirePaidPlan />}>
      <Route path="/support" element={<div>PAID FEATURE</div>} />
    </Route>
    <Route path="/billing" element={<div>BILLING PAGE</div>} />
    <Route path="/dashboard" element={<div>DASHBOARD</div>} />
  </Routes>
);

const renderAt = (user) =>
  renderWithProviders(tree, { route: '/support', atomValues: [[userAtom, user]] });

describe('RequirePaidPlan', () => {
  it('allows a paid-plan admin through', () => {
    renderAt({ role: 'admin', plan: 'Pro' });
    expect(screen.getByText('PAID FEATURE')).toBeInTheDocument();
  });

  it('allows staff through regardless of plan', () => {
    renderAt({ role: 'staff', plan: 'Free' });
    expect(screen.getByText('PAID FEATURE')).toBeInTheDocument();
  });

  it('sends a Free-plan admin to billing', () => {
    renderAt({ role: 'admin', plan: 'Free' });
    expect(screen.getByText('BILLING PAGE')).toBeInTheDocument();
  });

  it('sends a Free-plan non-admin to the dashboard', () => {
    renderAt({ role: 'manager', plan: 'Free' });
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
  });
});
