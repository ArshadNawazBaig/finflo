/**
 * components/member/InternalTransferForm — member-to-member transfer flow.
 * Covers: debounced recipient lookup → result selection, the submit-time
 * guards (no recipient, insufficient funds), and the happy path that opens the
 * confirm modal and POSTs the transfer with the right payload.
 *
 * api/toast are mocked; the avatar and confirm modal are stubbed so we drive
 * the form logic directly. Fake timers cover the 500ms lookup debounce.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const { error, success } = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('@/lib/axios', () => ({ default: { get, post } }));
vi.mock('sonner', () => ({ toast: { error, success } }));
vi.mock('@/components/member/MemberAvatar', () => ({ default: () => null }));
// Stub the confirm modal to a single button that invokes onConfirm with a token.
vi.mock('@/components/ui/TransactionConfirmModal', () => ({
  default: ({ isOpen, onConfirm, amount }) =>
    isOpen ? (
      <button data-testid="confirm-txn" onClick={() => onConfirm('tok-1')}>
        confirm {amount}
      </button>
    ) : null,
}));

import InternalTransferForm from '@/components/member/InternalTransferForm';

const MEMBER = { _id: 'me', currentBalance: 10000, savingBalance: 5000 };
const RECIPIENT = {
  _id: 'u1',
  name: 'John Doe',
  email: 'john@x.com',
  memberId: 'M-100',
  cnic: '35202-1234567-3',
};

// Routes api.get by URL: limits on mount, then the recipient lookup.
const wireApi = (lookupResults = [RECIPIENT]) => {
  get.mockImplementation((url) => {
    if (url.includes('my-limits')) return Promise.resolve({ data: {} });
    if (url.includes('lookup')) return Promise.resolve({ data: lookupResults });
    return Promise.resolve({ data: {} });
  });
  post.mockResolvedValue({ data: { success: true } });
};

// Typing the recipient's exact email triggers the form's auto-select, which
// sets lookupData without depending on a dropdown click (more robust under
// fake timers). The dropdown-click path is covered separately below.
const selectRecipient = async () => {
  fireEvent.change(screen.getByPlaceholderText('Search by Email, ID or CNIC'), {
    target: { value: 'john@x.com' },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500); // flush the debounce + lookup
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  get.mockReset();
  post.mockReset();
  error.mockReset();
  success.mockReset();
  wireApi();
});

afterEach(() => vi.useRealTimers());

describe('InternalTransferForm', () => {
  it('looks up a recipient after debounce and auto-selects an exact match', async () => {
    render(<InternalTransferForm member={MEMBER} />);
    await selectRecipient();
    // Verified green card shows the matched member's id.
    expect(screen.getByText('M-100')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining('lookup?identifier=john%40x.com'),
    );
  });

  it('selecting a dropdown result fills the recipient field', async () => {
    render(<InternalTransferForm member={MEMBER} />);
    fireEvent.change(screen.getByPlaceholderText('Search by Email, ID or CNIC'), {
      target: { value: 'joh' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    fireEvent.click(screen.getByText('John Doe'));
    // Clicking the result writes the chosen name back into the input.
    expect(screen.getByPlaceholderText('Search by Email, ID or CNIC')).toHaveValue('John Doe');
  });

  it('blocks submit with no verified recipient', async () => {
    const { container } = render(<InternalTransferForm member={MEMBER} />);
    fireEvent.submit(container.querySelector('form'));
    expect(error).toHaveBeenCalledWith('Valid recipient required');
    expect(screen.queryByTestId('confirm-txn')).not.toBeInTheDocument();
  });

  it('blocks a transfer that exceeds the available balance', async () => {
    const { container } = render(<InternalTransferForm member={MEMBER} />);
    await selectRecipient();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '99999' } });
    fireEvent.submit(container.querySelector('form'));
    expect(error).toHaveBeenCalledWith('Insufficient current funds');
    expect(screen.queryByTestId('confirm-txn')).not.toBeInTheDocument();
  });

  it('opens the confirm modal and POSTs the transfer on the happy path', async () => {
    const { container } = render(<InternalTransferForm member={MEMBER} />);
    await selectRecipient();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '2000' } });
    fireEvent.submit(container.querySelector('form'));

    // Confirm modal surfaced synchronously with the amount; confirming fires the POST.
    const confirm = screen.getByTestId('confirm-txn');
    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(post).toHaveBeenCalledWith(
      '/members/portal/transfer',
      expect.objectContaining({ recipientId: 'u1', amount: 2000, accountType: 'current' }),
      expect.objectContaining({ headers: { 'x-transaction-token': 'tok-1' } }),
    );
    expect(success).toHaveBeenCalledWith('Transfer sent successfully!');
  });
});
