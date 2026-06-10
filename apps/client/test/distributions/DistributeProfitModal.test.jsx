/**
 * components/DistributeProfitModal — react-hook-form profit distribution modal.
 * Covers: regular vs share copy/endpoint, required + min validation, the
 * happy-path POST (with parsed totalProfit) firing onSuccess/onClose, and the
 * server-error branch surfacing a root error.
 *
 * The form is portaled by Radix Dialog, so we submit it via its id and query
 * through `screen`. No fake timers — RHF validation resolves on real timers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
const { success, error } = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/lib/axios', () => ({ default: { post } }));
vi.mock('sonner', () => ({ toast: { success, error } }));

import DistributeProfitModal from '@/components/DistributeProfitModal';

const baseProps = () => ({
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
});

const submitForm = () => fireEvent.submit(document.getElementById('distribute-form'));

beforeEach(() => {
  post.mockReset();
  success.mockReset();
  error.mockReset();
  post.mockResolvedValue({ data: { message: 'Profit distributed' } });
});

describe('DistributeProfitModal', () => {
  it('renders the regular-distribution copy and custom-rates toggle', () => {
    render(<DistributeProfitModal {...baseProps()} type="regular" />);
    expect(screen.getByText('Profit Distribution')).toBeInTheDocument(); // eyebrow
    expect(screen.getByText('Share earnings with active regular members.')).toBeInTheDocument();
    expect(screen.getByText('Use Custom Rates')).toBeInTheDocument();
  });

  it('renders share-distribution copy and hides custom rates', () => {
    render(<DistributeProfitModal {...baseProps()} type="share" />);
    expect(screen.getByText('Share Profit')).toBeInTheDocument(); // eyebrow
    expect(screen.getByText('Distribute earnings to business share holders.')).toBeInTheDocument();
    expect(screen.queryByText('Use Custom Rates')).not.toBeInTheDocument();
  });

  it('shows a required error and does not POST when total profit is empty', async () => {
    render(<DistributeProfitModal {...baseProps()} />);
    submitForm();
    expect(await screen.findByText('Total profit is required')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects an amount below the minimum', async () => {
    render(<DistributeProfitModal {...baseProps()} />);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '0' } });
    submitForm();
    expect(await screen.findByText('Amount must be at least 1')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('POSTs to the regular endpoint and fires success callbacks', async () => {
    const props = baseProps();
    render(<DistributeProfitModal {...props} type="regular" />);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1500.5' } });
    submitForm();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith(
      '/members/distribute-profit',
      expect.objectContaining({ totalProfit: 1500.5 }),
    );
    expect(success).toHaveBeenCalledWith('Profit distributed');
    expect(props.onSuccess).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('POSTs to the share endpoint for the share type', async () => {
    render(<DistributeProfitModal {...baseProps()} type="share" />);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '900' } });
    submitForm();
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith(
      '/members/distribute-share-profit',
      expect.objectContaining({ totalProfit: 900 }),
    );
  });

  it('surfaces a server error as a root message', async () => {
    post.mockRejectedValue({ response: { data: { message: 'Not enough profit' } } });
    render(<DistributeProfitModal {...baseProps()} />);
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '1000' } });
    submitForm();

    expect(await screen.findByText('Not enough profit')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Not enough profit');
  });
});
