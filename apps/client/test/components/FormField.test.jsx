/**
 * ui/FormField — label (+ required marker), control children, and a
 * hint/error message where error takes precedence over hint.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';

describe('FormField', () => {
  it('renders the label, required marker, and children', () => {
    render(
      <FormField label="Full Name" htmlFor="name" required>
        <Input id="name" defaultValue="x" />
      </FormField>,
    );
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByDisplayValue('x')).toBeInTheDocument();
  });

  it('renders an error with role="alert" and hides the hint', () => {
    render(
      <FormField label="Email" error="Email is required" hint="We never share it">
        <Input />
      </FormField>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    expect(screen.queryByText('We never share it')).not.toBeInTheDocument();
  });

  it('renders the hint when there is no error', () => {
    render(
      <FormField label="Email" hint="We never share it">
        <Input />
      </FormField>,
    );
    expect(screen.getByText('We never share it')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
