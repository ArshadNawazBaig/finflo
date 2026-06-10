/** lib/utils — copyToClipboard: Clipboard API with an execCommand fallback. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from '@/lib/utils';

const setClipboard = (value) =>
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });

afterEach(() => {
  setClipboard(undefined);
  vi.restoreAllMocks();
});

describe('copyToClipboard', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue();
    setClipboard({ writeText });

    expect(await copyToClipboard('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    setClipboard(undefined);
    // jsdom doesn't implement execCommand, so define it before asserting.
    const exec = vi.fn().mockReturnValue(true);
    document.execCommand = exec;

    expect(await copyToClipboard('fallback')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });
});
