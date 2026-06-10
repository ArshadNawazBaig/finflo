/**
 * Branches page — the default branch shows a "Default" badge and a disabled star;
 * a non-default branch's star triggers PUT /branches/:id/default.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../helpers/render';
import api from '@/lib/axios';
import { userAtom } from '@/atoms';
import Branches from '@/pages/admin/Branches';

const asAdmin = { atomValues: [[userAtom, { role: 'admin', isManager: false }]] };

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
// Tooltip relies on a global TooltipProvider mounted at the app root; render its
// children directly so the page can be tested in isolation.
vi.mock('@/components/ui/Tooltip', () => ({ default: ({ children }) => children }));

const branches = [
  { _id: 'b1', name: 'HQ', address: 'a', contactNumber: '1', isActive: true, isDefault: true, branding: {} },
  { _id: 'b2', name: 'Annex', address: 'b', contactNumber: '2', isActive: true, isDefault: false, branding: {} },
];

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
  api.get.mockImplementation((url) =>
    Promise.resolve({ data: url.startsWith('/branches') ? branches : [] }),
  );
  api.put.mockResolvedValue({ data: { ...branches[1], isDefault: true } });
});

describe('Branches default-branch UI', () => {
  it('renders a Default badge and a disabled star on the default branch', async () => {
    renderWithProviders(<Branches />, asAdmin);
    await screen.findByText('Annex');

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByLabelText('Default branch')).toBeDisabled();
  });

  it('sets a non-default branch as default via PUT /branches/:id/default', async () => {
    renderWithProviders(<Branches />, asAdmin);
    await screen.findByText('Annex');

    fireEvent.click(screen.getByLabelText('Set as default branch'));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/branches/b2/default'),
    );
  });
});
