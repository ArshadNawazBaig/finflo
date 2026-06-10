/**
 * hooks/useMediaQuery + useIsMobile — subscribe to a CSS media query via the
 * native matchMedia API and re-render on change. jsdom has no matchMedia, so
 * we install a controllable fake and drive its `change` event.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useIsMobile } from '@/hooks/useIsMobile';

// Installs a fake matchMedia and returns an `emit` to flip the match state.
function installMatchMedia(initialMatches) {
  let listeners = [];
  const mql = {
    matches: initialMatches,
    addEventListener: (_event, cb) => listeners.push(cb),
    removeEventListener: (_event, cb) => {
      listeners = listeners.filter((l) => l !== cb);
    },
  };
  window.matchMedia = vi.fn(() => mql);
  return {
    emit: (matches) => {
      mql.matches = matches;
      act(() => listeners.forEach((l) => l({ matches })));
    },
    mql,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('returns the initial match state', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', () => {
    const { emit } = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
    emit(true);
    expect(result.current).toBe(true);
  });

  it('passes the query string through to matchMedia', () => {
    installMatchMedia(false);
    renderHook(() => useMediaQuery('(max-width: 500px)'));
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 500px)');
  });

  it('removes its listener on unmount', () => {
    const { mql } = installMatchMedia(false);
    const spy = vi.spyOn(mql, 'removeEventListener');
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 500px)'));
    unmount();
    expect(spy).toHaveBeenCalled();
  });
});

describe('useIsMobile', () => {
  it('queries the 767px mobile breakpoint and reflects a match', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    expect(result.current).toBe(true);
  });
});
