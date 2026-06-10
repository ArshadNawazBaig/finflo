/**
 * components/ui/ConfirmActionModal — variant-aware confirm dialog. Renders only
 * when open, surfaces title/description, fires onConfirm / onClose, swaps the
 * accent copy per variant, and disables the cancel button while loading.
 * Radix Dialog portals into document.body, so we query via screen (not container).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  title: 'Delete loan?',
  description: 'This removes the loan permanently.',
};

describe('ConfirmActionModal', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmActionModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText('Delete loan?')).not.toBeInTheDocument();
  });

  it('shows the title and description when open', () => {
    render(<ConfirmActionModal {...baseProps} />);
    expect(screen.getByText('Delete loan?')).toBeInTheDocument();
    expect(screen.getByText('This removes the loan permanently.')).toBeInTheDocument();
  });

  it('uses the danger accent note by default', () => {
    render(<ConfirmActionModal {...baseProps} />);
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('swaps to the info accent copy for the info variant', () => {
    render(<ConfirmActionModal {...baseProps} variant="info" />);
    expect(screen.getByText('You can change this later.')).toBeInTheDocument();
  });

  it('fires onConfirm and onClose from the footer buttons', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmActionModal
        {...baseProps}
        onConfirm={onConfirm}
        onClose={onClose}
        confirmText="Yes, delete"
        cancelText="Keep it"
      />,
    );
    fireEvent.click(screen.getByText('Yes, delete'));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Keep it'));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables the cancel button while loading', () => {
    render(<ConfirmActionModal {...baseProps} loading cancelText="Cancel" />);
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});
