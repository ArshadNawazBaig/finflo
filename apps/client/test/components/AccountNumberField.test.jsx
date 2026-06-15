/**
 * ui/AccountNumberField — read-only account-number input paired with an optional
 * "Generate" button, composed on FormField. Covers value rendering, the
 * generate-button presence/click, the no-handler case, the empty placeholder,
 * and error propagation through FormField.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountNumberField from '@/components/ui/AccountNumberField';

describe('AccountNumberField', () => {
  it('renders the label and the account number in a read-only input', () => {
    render(
      <AccountNumberField label="Saving A/C" name="savingAccount" value="SAV-12345" />,
    );
    expect(screen.getByText('Saving A/C')).toBeInTheDocument();
    const input = screen.getByDisplayValue('SAV-12345');
    expect(input).toHaveAttribute('readonly');
  });

  it('shows the Generate button and fires onGenerate on click', () => {
    const onGenerate = vi.fn();
    render(<AccountNumberField name="savingAccount" onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole('button', { name: /gen/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('hides the Generate button when onGenerate is omitted', () => {
    render(<AccountNumberField name="savingAccount" value="X" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the placeholder when there is no value', () => {
    render(<AccountNumberField name="loanAccount" placeholder="Click Generate" />);
    expect(screen.getByPlaceholderText('Click Generate')).toBeInTheDocument();
  });

  it('renders a validation error via FormField', () => {
    render(<AccountNumberField name="currentAccount" error="Account is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Account is required');
  });
});
