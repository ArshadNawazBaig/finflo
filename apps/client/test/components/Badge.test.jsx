/**
 * components/ui/badge — cva-driven variant classes. Defaults to the primary
 * variant, applies the requested variant, and merges caller className.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('uses the primary variant by default', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toMatch(/bg-primary/);
  });

  it('applies the destructive variant', () => {
    render(<Badge variant="destructive">Overdue</Badge>);
    expect(screen.getByText('Overdue').className).toMatch(/bg-destructive/);
  });

  it('merges a custom className', () => {
    render(<Badge className="custom-x">Tag</Badge>);
    expect(screen.getByText('Tag').className).toMatch(/custom-x/);
  });
});
