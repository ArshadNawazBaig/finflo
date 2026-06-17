/**
 * components/StepUpModal — the global step-up re-auth prompt. Opens on a
 * `stepup:required` event, collects the password or TOTP code per `factor`,
 * POSTs to the right reauth endpoint, and resolves the pending request.
 * api is mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: { post } }));

import StepUpModal from '@/components/StepUpModal';

const fireRequired = (factor) => {
  const resolve = vi.fn();
  const reject = vi.fn();
  window.dispatchEvent(
    new CustomEvent('stepup:required', { detail: { factor, resolve, reject } }),
  );
  return { resolve, reject };
};

beforeEach(() => {
  post.mockReset();
  window.history.pushState({}, '', '/');
});

describe('StepUpModal', () => {
  it('opens a password field and resolves with the minted proof token', async () => {
    post.mockResolvedValue({ data: { token: 'proof', expiresIn: 900 } });
    render(<StepUpModal />);
    const { resolve } = fireRequired('password');

    const input = await screen.findByPlaceholderText('Your password');
    fireEvent.change(input, { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('Verify'));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/reauth', { password: 'secret' }),
    );
    await waitFor(() => expect(resolve).toHaveBeenCalledWith('proof', 900));
  });

  it('opens a code field for the 2fa factor and posts the code', async () => {
    post.mockResolvedValue({ data: { token: 'proof', expiresIn: 900 } });
    render(<StepUpModal />);
    fireRequired('2fa');

    const input = await screen.findByPlaceholderText('123456');
    fireEvent.change(input, { target: { value: '654321' } });
    fireEvent.click(screen.getByText('Verify'));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/reauth', { code: '654321' }),
    );
  });

  it('shows the server error and does not resolve on a bad credential', async () => {
    post.mockRejectedValue({
      response: { data: { message: 'Incorrect password.' } },
    });
    render(<StepUpModal />);
    const { resolve } = fireRequired('password');

    fireEvent.change(await screen.findByPlaceholderText('Your password'), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByText('Verify'));

    await waitFor(() =>
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument(),
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects the pending request when cancelled', async () => {
    render(<StepUpModal />);
    const { reject } = fireRequired('password');
    await screen.findByPlaceholderText('Your password');
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(reject).toHaveBeenCalled());
  });

  it('targets the member reauth endpoint on a /member/ path', async () => {
    post.mockResolvedValue({ data: { token: 'p', expiresIn: 900 } });
    window.history.pushState({}, '', '/member/settings');
    render(<StepUpModal />);
    fireRequired('password');

    fireEvent.change(await screen.findByPlaceholderText('Your password'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('Verify'));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/member-auth/reauth', { password: 'x' }),
    );
  });
});
