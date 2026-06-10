/**
 * components/ui/TableSearch — controlled search box. Renders the bound value,
 * forwards the raw string (not the event) to onChange, and honours a custom
 * placeholder with a sensible default.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TableSearch from '@/components/ui/TableSearch';

describe('TableSearch', () => {
  it('shows the default placeholder and the controlled value', () => {
    render(<TableSearch value="ali" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveValue('ali');
  });

  it('uses a custom placeholder when provided', () => {
    render(<TableSearch value="" onChange={() => {}} placeholder="Find member" />);
    expect(screen.getByPlaceholderText('Find member')).toBeInTheDocument();
  });

  it('forwards the typed string to onChange', () => {
    const onChange = vi.fn();
    render(<TableSearch value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search...'), {
      target: { value: 'khan' },
    });
    expect(onChange).toHaveBeenCalledWith('khan');
  });
});
