/**
 * components/InviteMemberModal — admin modal that invites members by email.
 * Parses a free-form email list, POSTs to /members/invite, and surfaces the
 * per-email summary (sent / skipped) returned by the server. api + sonner are
 * mocked; the Radix Dialog portals into document.body so we query via screen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const { success, error } = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/axios', () => ({ default: { get, post } }));
vi.mock('sonner', () => ({ toast: { success, error } }));

import InviteMemberModal from '@/components/InviteMemberModal';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  success.mockReset();
  error.mockReset();
  get.mockResolvedValue({ data: [] }); // /branches
});

describe('InviteMemberModal', () => {
  it('submits the entered emails to POST /members/invite and reports success', async () => {
    post.mockResolvedValue({
      data: { sent: [{ email: 'ali@example.com' }, { email: 'sara@example.com' }], skipped: [], errors: [] },
    });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <InviteMemberModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    );

    const textarea = await screen.findByPlaceholderText(/ali@example.com/i);
    fireEvent.change(textarea, {
      target: { value: 'ali@example.com, sara@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/members/invite', {
        emails: ['ali@example.com', 'sara@example.com'],
        branchId: undefined,
        profitRate: undefined,
      }),
    );

    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the modal open and shows skipped emails with reasons', async () => {
    post.mockResolvedValue({
      data: {
        sent: [{ email: 'new@example.com' }],
        skipped: [{ email: 'dup@example.com', reason: 'Already a member' }],
        errors: [],
      },
    });
    const onSuccess = vi.fn();

    render(
      <InviteMemberModal isOpen onClose={() => {}} onSuccess={onSuccess} />,
    );

    const textarea = await screen.findByPlaceholderText(/ali@example.com/i);
    fireEvent.change(textarea, {
      target: { value: 'new@example.com dup@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/dup@example.com — Already a member/i),
      ).toBeInTheDocument(),
    );
    // skipped results keep the modal open so onSuccess isn't called yet
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('blocks submit and flags an invalid email without calling the API', async () => {
    render(<InviteMemberModal isOpen onClose={() => {}} onSuccess={() => {}} />);

    const textarea = await screen.findByPlaceholderText(/ali@example.com/i);
    fireEvent.change(textarea, { target: { value: 'not-an-email' } });

    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() =>
      expect(screen.getByText(/Invalid email/i)).toBeInTheDocument(),
    );
    expect(post).not.toHaveBeenCalled();
  });
});
