/**
 * lib/axios — unwrapEnvelope mirrors the server responseEnvelope: it unwraps a
 * success envelope back to its payload so existing callers read `res.data` /
 * `res.data.data` unchanged, and leaves non-enveloped + error bodies raw.
 */
import { describe, it, expect } from 'vitest';
import { unwrapEnvelope } from '@/lib/axios';

describe('unwrapEnvelope', () => {
  it('unwraps a success envelope to its data payload', () => {
    expect(unwrapEnvelope({ success: true, data: { id: 1 } })).toEqual({ id: 1 });
  });

  it('unwraps a paginated list envelope, preserving the meta', () => {
    const list = { data: [1, 2], totalEntries: 2, totalPages: 1, currentPage: 1 };
    expect(unwrapEnvelope({ success: true, data: list })).toEqual(list);
  });

  it('passes a non-enveloped response through unchanged', () => {
    expect(unwrapEnvelope({ id: 1, name: 'x' })).toEqual({ id: 1, name: 'x' });
  });

  it('leaves an error envelope (success:false) raw so message stays readable', () => {
    expect(unwrapEnvelope({ success: false, message: 'Boom' })).toEqual({
      success: false,
      message: 'Boom',
    });
  });

  it('handles null / primitive bodies', () => {
    expect(unwrapEnvelope(null)).toBe(null);
    expect(unwrapEnvelope('plain text')).toBe('plain text');
  });
});
