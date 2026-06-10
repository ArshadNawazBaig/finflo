/**
 * hooks/useDocumentTitle — sets the browser tab title as "<title> | Finflo
 * Banking OS" and restores the bare site name on unmount.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useDocumentTitle from '@/hooks/useDocumentTitle';

describe('useDocumentTitle', () => {
  it('sets the tab title with the site-name suffix', () => {
    renderHook(() => useDocumentTitle('Login'));
    expect(document.title).toBe('Login | Finflo Banking OS');
  });

  it('updates the title when the argument changes', () => {
    const { rerender } = renderHook(({ t }) => useDocumentTitle(t), {
      initialProps: { t: 'Dashboard' },
    });
    expect(document.title).toBe('Dashboard | Finflo Banking OS');
    rerender({ t: 'Settings' });
    expect(document.title).toBe('Settings | Finflo Banking OS');
  });

  it('restores the bare site name on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Reports'));
    expect(document.title).toBe('Reports | Finflo Banking OS');
    unmount();
    expect(document.title).toBe('Finflo Banking OS');
  });
});
