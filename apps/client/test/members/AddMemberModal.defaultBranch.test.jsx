/**
 * AddMemberModal — when branches exist, the branch selector pre-selects the
 * tenant's default branch (marked "(Default)") and the form is submittable.
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

describe('AddMemberModal with branches', () => {
  it('pre-selects the default branch and enables submit', async () => {
    api.get.mockResolvedValue({
      data: [
        { _id: 'b1', name: 'HQ', isDefault: false },
        { _id: 'b2', name: 'Main', isDefault: true },
      ],
    });

    renderWithProviders(
      <AddMemberModal isOpen onClose={() => {}} onSuccess={() => {}} />,
    );

    const select = await screen.findByRole('combobox');
    await waitFor(() => expect(select).toHaveValue('b2')); // default pre-selected

    expect(screen.getByRole('option', { name: /Main \(Default\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /onboard member/i })).toBeEnabled();
  });
});
