/**
 * components/ui/SensitiveData — PII masking with an eye-toggle. Hidden by
 * default, masks string content (min 6 chars), reveals on click, and the
 * SensitiveBalance variant shows the "Rs.••••••" placeholder when hidden.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SensitiveData, { SensitiveBalance } from '@/components/ui/SensitiveData';

describe('SensitiveData', () => {
  it('masks the content by default and exposes a reveal control', () => {
    render(<SensitiveData>35202-1234567-3</SensitiveData>);
    expect(screen.queryByText('35202-1234567-3')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Show sensitive data')).toBeInTheDocument();
  });

  it('masks with at least 6 bullets for short content', () => {
    const { container } = render(<SensitiveData>123</SensitiveData>);
    expect(container.textContent).toContain('••••••');
  });

  it('reveals the real value on toggle, then re-hides', () => {
    render(<SensitiveData>secret-value</SensitiveData>);
    fireEvent.click(screen.getByLabelText('Show sensitive data'));
    expect(screen.getByText('secret-value')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Hide sensitive data'));
    expect(screen.queryByText('secret-value')).not.toBeInTheDocument();
  });

  it('honours defaultVisible', () => {
    render(<SensitiveData defaultVisible>visible-now</SensitiveData>);
    expect(screen.getByText('visible-now')).toBeInTheDocument();
  });
});

describe('SensitiveBalance', () => {
  it('shows the masked placeholder until revealed', () => {
    render(<SensitiveBalance>Rs.5,000</SensitiveBalance>);
    expect(screen.getByText('Rs.••••••')).toBeInTheDocument();
    expect(screen.queryByText('Rs.5,000')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Show balance'));
    expect(screen.getByText('Rs.5,000')).toBeInTheDocument();
  });
});
