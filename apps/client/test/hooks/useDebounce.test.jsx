/**
 * hooks/useDebounce — returns a debounced copy of `value` that only updates
 * after `delay` ms have elapsed with no further change. We drive the debounce
 * window with fake timers and advance them inside `act`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebounce from '@/hooks/useDebounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebounce', () => {
  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebounce('hello', 400));
    expect(result.current).toBe('hello');
  });

  it('does not update until the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'ab' });
    // Before the window closes the debounced value is still the old one.
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('only emits the latest value when changes arrive faster than the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: '' } },
    );

    // Simulate rapid keystrokes — each one resets the timer.
    rerender({ value: 'l' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'lo' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'loa' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: 'loan' });

    // No full quiet window has passed yet, so nothing emitted.
    expect(result.current).toBe('');

    // After a full quiet window only the final value emits (one update, not four).
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('loan');
  });

  it('defaults the delay to 400ms when none is provided', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'x' },
    });

    rerender({ value: 'y' });
    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe('x');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('y');
  });
});
