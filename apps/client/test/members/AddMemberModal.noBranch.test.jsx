/**
 * AddMemberModal — when the tenant has NO branch, the form must block creation:
 * a warning replaces the branch selector and the submit button is disabled.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../helpers/render';
import api from '@/lib/axios';
import AddMemberModal from '@/components/AddMemberModal';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/components/kyc/KycOcrScanner', () => ({ default: () => null }));
vi.mock('@/components/ui/SignaturePad', () => ({ default: () => null }));

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ role: 'admin', businessAbbreviation: 'MLO' }));
});

describe('AddMemberModal with no branches', () => {
  it('shows the "create a branch first" warning and disables submit', async () => {
    api.get.mockResolvedValue({ data: [] }); // GET /branches → none

    renderWithProviders(
      <AddMemberModal isOpen onClose={() => {}} onSuccess={() => {}} />,
    );

    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/branches'));

    expect(await screen.findByText(/create a branch first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /onboard member/i })).toBeDisabled();
  });
});
