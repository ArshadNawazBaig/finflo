/**
 * components/customers/CreditScoreBreakdown — "View breakdown" affordance that
 * lazily fetches GET /customers/:id/credit-score and renders each component's
 * points/max plus the factors list inside a Radix popover.
 *
 * api/toast are mocked. The popover portals to document.body, so we query via
 * `screen` after clicking the trigger.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
const { error } = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('@/lib/axios', () => ({ default: { get } }));
vi.mock('sonner', () => ({ toast: { error } }));

import CreditScoreBreakdown from '@/components/customers/CreditScoreBreakdown';

const BREAKDOWN = {
  score: 74,
  band: 'Good',
  multiplier: 1.1,
  factors: ['Strong on-time repayment record', 'Low utilization'],
  components: {
    punctuality: { points: 26, max: 30, onTime: 12, late: 1 },
    delinquency: { points: 25, max: 25, defaults: 0, overdue: 0 },
  },
};

beforeEach(() => {
  get.mockReset();
  error.mockReset();
});

describe('CreditScoreBreakdown', () => {
  it('fetches and shows component points and factors on open', async () => {
    get.mockResolvedValue({ data: BREAKDOWN });
    render(<CreditScoreBreakdown customerId="c1" />);

    fireEvent.click(screen.getByText('View breakdown'));

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/customers/c1/credit-score'),
    );
    expect(await screen.findByText('Punctuality')).toBeInTheDocument();
    expect(screen.getByText('26/30')).toBeInTheDocument();
    expect(screen.getByText('25/25')).toBeInTheDocument();
    expect(
      screen.getByText('Strong on-time repayment record'),
    ).toBeInTheDocument();
  });

  it('toasts on a failed fetch', async () => {
    get.mockRejectedValue({ response: { data: { message: 'nope' } } });
    render(<CreditScoreBreakdown customerId="c1" />);

    fireEvent.click(screen.getByText('View breakdown'));

    await waitFor(() => expect(error).toHaveBeenCalledWith('nope'));
  });
});
