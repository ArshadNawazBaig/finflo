/**
 * components/CreditScoreBadge — band-colored pill mirroring the loan risk-grade
 * styling. Maps each band to a color, optionally shows the score, and degrades
 * to a muted "Not scored" pill when band/score are missing.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreditScoreBadge from '@/components/CreditScoreBadge';

describe('CreditScoreBadge', () => {
  it('renders the band label', () => {
    render(<CreditScoreBadge score={74} band="Good" />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows the score when showScore is set', () => {
    render(<CreditScoreBadge score={74} band="Good" showScore />);
    expect(screen.getByText('Good · 74')).toBeInTheDocument();
  });

  it('colors Excellent green and Very Poor red', () => {
    const { rerender } = render(<CreditScoreBadge score={95} band="Excellent" />);
    expect(screen.getByText('Excellent').className).toMatch(/emerald/);

    rerender(<CreditScoreBadge score={10} band="Very Poor" />);
    expect(screen.getByText('Very Poor').className).toMatch(/red/);
  });

  it('renders a muted "Not scored" pill when band is missing', () => {
    render(<CreditScoreBadge score={undefined} band={undefined} />);
    expect(screen.getByText('Not scored').className).toMatch(/text-muted-foreground/);
  });

  it('renders "Not scored" when the score is null even if band is present', () => {
    render(<CreditScoreBadge score={null} band="Good" />);
    expect(screen.getByText('Not scored')).toBeInTheDocument();
  });
});
