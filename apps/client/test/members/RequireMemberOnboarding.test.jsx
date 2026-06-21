/**
 * components/auth/RequireMemberOnboarding — gates the member portal. An
 * un-onboarded member is redirected to /member/setup; an onboarded member (or
 * one with the cached localStorage flag) passes through to the dashboard. api is
 * mocked; routing is exercised through a small <Routes> tree.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, screen, waitFor } from '../helpers/render';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: { get } }));

import RequireMemberOnboarding from '@/components/auth/RequireMemberOnboarding';
import { memberAtom } from '@/atoms';
import { memberOnboardedKey } from '@/lib/onboarding';

const renderGuard = () =>
  renderWithProviders(
    <Routes>
      <Route element={<RequireMemberOnboarding />}>
        <Route path="/member/dashboard" element={<div>DASHBOARD</div>} />
      </Route>
      <Route path="/member/setup" element={<div>SETUP</div>} />
    </Routes>,
    { route: '/member/dashboard', atomValues: [[memberAtom, { _id: 'm1' }]] },
  );

beforeEach(() => {
  get.mockReset();
  localStorage.clear();
});

describe('RequireMemberOnboarding', () => {
  it('allows through without an API call when the cached flag is set', () => {
    localStorage.setItem(memberOnboardedKey('m1'), '1');

    renderGuard();

    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('redirects to /member/setup when onboarding is not complete', async () => {
    get.mockResolvedValue({ data: { isCompleted: false } });

    renderGuard();

    await waitFor(() => expect(screen.getByText('SETUP')).toBeInTheDocument());
    expect(get).toHaveBeenCalledWith('/member-auth/onboarding');
  });

  it('allows through and caches the flag when onboarding is complete', async () => {
    get.mockResolvedValue({ data: { isCompleted: true } });

    renderGuard();

    await waitFor(() =>
      expect(screen.getByText('DASHBOARD')).toBeInTheDocument(),
    );
    expect(localStorage.getItem(memberOnboardedKey('m1'))).toBe('1');
  });
});
