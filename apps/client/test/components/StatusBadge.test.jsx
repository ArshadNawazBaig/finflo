/**
 * ui/StatusBadge — resolves a tone (color) from the status string, humanizes
 * the label, and honours explicit label/tone overrides.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('maps known statuses to the right tone', () => {
    const cases = [
      ['active', 'emerald'],
      ['paid', 'emerald'],
      ['pending', 'amber'],
      ['overdue', 'rose'],
      ['rejected', 'rose'],
      ['inactive', 'slate'],
    ];
    for (const [status, color] of cases) {
      const { unmount } = render(<StatusBadge status={status} />);
      const el = screen.getByText(new RegExp(status, 'i'));
      expect(el.className).toContain(color);
      unmount();
    }
  });

  it('falls back to neutral (slate) for unknown statuses', () => {
    render(<StatusBadge status="weird_thing" />);
    expect(screen.getByText('Weird Thing').className).toContain('slate');
  });

  it('humanizes snake/kebab status keys', () => {
    render(<StatusBadge status="in_review" />);
    expect(screen.getByText('In Review')).toBeInTheDocument();
  });

  it('honours explicit label and tone overrides', () => {
    render(<StatusBadge status="active" label="Custom" tone="error" />);
    const el = screen.getByText('Custom');
    expect(el.className).toContain('rose');
  });
});
