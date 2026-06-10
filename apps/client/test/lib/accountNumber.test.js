/** lib/utils — generateDynamicAccountNumber (13-char, business-abbr prefixed). */
import { describe, it, expect } from 'vitest';
import { generateDynamicAccountNumber } from '@/lib/utils';

describe('generateDynamicAccountNumber', () => {
  it('builds a 13-char number with the ABBR-TYPE-count prefix', () => {
    const acc = generateDynamicAccountNumber(
      { businessAbbreviation: 'MLO', customerCount: 0 },
      'SAV',
    );
    expect(acc).toMatch(/^MLO-S-100001\d$/);
    expect(acc).toHaveLength(13);
  });

  it('increments the count component with customerCount', () => {
    const acc = generateDynamicAccountNumber(
      { businessAbbreviation: 'MLO', customerCount: 4 },
      'CURRENT',
    );
    expect(acc.startsWith('MLO-C-100005')).toBe(true);
  });

  it('falls back to the bare type when no abbreviation is set', () => {
    const acc = generateDynamicAccountNumber({ customerCount: 0 }, 'LOAN');
    expect(acc.startsWith('LOAN-100001')).toBe(true);
  });
});
