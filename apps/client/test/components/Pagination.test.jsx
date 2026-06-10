/**
 * components/ui/Pagination — entry-range math, prev/next disabling at the
 * bounds, and page-number clicks. The limit Select is stubbed to a plain
 * passthrough so we exercise the pagination logic, not Radix's portal.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '@/components/ui/Pagination';

// Radix Select needs pointer APIs jsdom lacks; stub to trivial elements.
vi.mock('@/components/ui/select', () => {
  const Pass = ({ children }) => <div>{children}</div>;
  return {
    Select: Pass,
    SelectContent: Pass,
    SelectItem: Pass,
    SelectTrigger: Pass,
    SelectValue: () => null,
  };
});

const baseProps = {
  currentPage: 2,
  totalPages: 5,
  totalEntries: 48,
  limit: 10,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
};

describe('Pagination', () => {
  it('shows the correct entry range for the current page', () => {
    render(<Pagination {...baseProps} />);
    expect(screen.getByText(/Showing 11 to 20 of 48 entries/)).toBeInTheDocument();
  });

  it('caps the end entry at totalEntries on the last page', () => {
    render(<Pagination {...baseProps} currentPage={5} />);
    // page 5, limit 10 → 41..48 (not 50)
    expect(screen.getByText(/Showing 41 to 48 of 48 entries/)).toBeInTheDocument();
  });

  it('renders the empty-state label when there are no entries', () => {
    render(<Pagination {...baseProps} totalEntries={0} totalPages={0} />);
    expect(screen.getByText('No entries to show')).toBeInTheDocument();
  });

  it('fires onPageChange with the clicked page number', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...baseProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables prev on the first page and next on the last', () => {
    const { unmount } = render(<Pagination {...baseProps} currentPage={1} />);
    const firstButtons = screen.getAllByRole('button');
    expect(firstButtons[0]).toBeDisabled(); // prev (chevron-left)
    unmount();

    render(<Pagination {...baseProps} currentPage={5} />);
    const lastButtons = screen.getAllByRole('button');
    expect(lastButtons[lastButtons.length - 1]).toBeDisabled(); // next (chevron-right)
  });
});
