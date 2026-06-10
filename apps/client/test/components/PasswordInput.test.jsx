/**
 * components/ui/PasswordInput — masked input with a show/hide eye toggle.
 * Starts as type=password, flips to text on toggle, and forwards arbitrary
 * input props (value/onChange/placeholder) to the underlying <input>.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordInput from '@/components/ui/PasswordInput';

describe('PasswordInput', () => {
  it('renders a masked input by default', () => {
    render(<PasswordInput placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
  });

  it('toggles to a visible input and back', () => {
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');

    fireEvent.click(screen.getByLabelText('Show password'));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('forwards value and onChange to the input', () => {
    const onChange = vi.fn();
    render(<PasswordInput placeholder="Password" value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'hunter2' },
    });
    expect(onChange).toHaveBeenCalled();
  });
});
