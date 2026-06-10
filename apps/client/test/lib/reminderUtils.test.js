/**
 * lib/reminderUtils — builds WhatsApp (wa.me) and mailto deep-links for loan
 * repayment reminders. Covers PK phone normalization, overdue vs upcoming
 * copy, and URL-encoding of the message body.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { generateWhatsAppLink, generateEmailLink } from '@/lib/reminderUtils';

// formatCurrency (used inside the message) reads the symbol from localStorage;
// clear it so every case sees the default "Rs." prefix.
beforeEach(() => localStorage.clear());

describe('generateWhatsAppLink', () => {
  it('normalizes a local 03xx number to the 92 country code', () => {
    const url = generateWhatsAppLink('0300-1234567', 'Ali', 5000, '2026-06-10');
    expect(url.startsWith('https://wa.me/923001234567?text=')).toBe(true);
  });

  it('prepends 92 to a bare 10-digit number', () => {
    const url = generateWhatsAppLink('3001234567', 'Ali', 5000, '2026-06-10');
    expect(url.startsWith('https://wa.me/923001234567?text=')).toBe(true);
  });

  it('marks the message OVERDUE and includes amount + due date', () => {
    const url = generateWhatsAppLink('03001234567', 'Ali', 5000, '2026-06-10', true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toMatch(/OVERDUE/);
    expect(text).toContain('Ali');
    expect(text).toContain('Rs.5,000');
    expect(text).toContain('June 10, 2026');
  });

  it('uses friendly wording when not overdue', () => {
    const url = generateWhatsAppLink('03001234567', 'Ali', 5000, '2026-06-10', false);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toMatch(/friendly reminder/i);
    expect(text).not.toMatch(/OVERDUE/);
  });

  it('produces a URL-encoded query (no raw spaces)', () => {
    const url = generateWhatsAppLink('03001234567', 'Ali', 5000, '2026-06-10');
    expect(url.split('?text=')[1]).not.toContain(' ');
  });
});

describe('generateEmailLink', () => {
  it('builds a mailto with an URGENT subject when overdue', () => {
    const url = generateEmailLink('a@b.com', 'Ali', 5000, '2026-06-10', true);
    expect(url.startsWith('mailto:a@b.com?subject=')).toBe(true);
    const subject = decodeURIComponent(url.split('subject=')[1].split('&body=')[0]);
    expect(subject).toMatch(/URGENT/);
    expect(subject).toContain('Ali');
  });

  it('uses a reminder subject and friendly body when not overdue', () => {
    const url = generateEmailLink('a@b.com', 'Ali', 5000, '2026-06-10', false);
    const subject = decodeURIComponent(url.split('subject=')[1].split('&body=')[0]);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(subject).toMatch(/Reminder/i);
    expect(subject).not.toMatch(/URGENT/);
    expect(body).toContain('Rs.5,000');
    expect(body).toMatch(/friendly reminder/i);
  });
});
