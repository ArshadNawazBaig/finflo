/**
 * components/StatsCard — KPI tile. Renders title + amount, shows a signed delta
 * with the right direction colour, hides the delta row when percentage is
 * absent, and masks the value behind SensitiveBalance when `sensitive`.
 * Tooltip is stubbed to a passthrough (it needs a provider it doesn't get here).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/Tooltip', () => ({ default: ({ children }) => children }));

import StatsCard from '@/components/StatsCard';

const Icon = () => <svg data-testid="icon" />;

describe('StatsCard', () => {
  it('renders the title and amount', () => {
    render(<StatsCard title="Total Loans" amount="Rs.5,000" icon={<Icon />} color="bg-emerald-500" />);
    expect(screen.getByText('Total Loans')).toBeInTheDocument();
    expect(screen.getByText('Rs.5,000')).toBeInTheDocument();
  });

  it('shows a positive delta with a + sign', () => {
    render(<StatsCard title="Revenue" amount="Rs.1,000" percentage={12.5} icon={<Icon />} color="bg-emerald-500" />);
    expect(screen.getByText('+12.50%')).toBeInTheDocument();
  });

  it('shows a negative delta without an added + sign', () => {
    render(<StatsCard title="Revenue" amount="Rs.1,000" percentage={-4} icon={<Icon />} color="bg-rose-500" />);
    expect(screen.getByText('-4.00%')).toBeInTheDocument();
  });

  it('omits the delta row when percentage is not provided', () => {
    render(<StatsCard title="Members" amount="42" icon={<Icon />} color="bg-primary" />);
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('masks a sensitive amount until revealed', () => {
    render(<StatsCard title="Balance" amount="Rs.9,999" icon={<Icon />} color="bg-primary" sensitive />);
    expect(screen.queryByText('Rs.9,999')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Show balance'));
    expect(screen.getByText('Rs.9,999')).toBeInTheDocument();
  });

  it('renders an optional badge', () => {
    render(<StatsCard title="Plan" amount="Pro" badge="NEW" icon={<Icon />} color="bg-primary" />);
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });
});
