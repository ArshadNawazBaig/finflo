/**
 * hooks/useClickOutside — fires the callback on an outside pointer interaction
 * (mousedown/touchstart), ignores clicks inside the referenced element, and
 * detaches when disabled.
 */
/* eslint-disable react/prop-types -- throwaway test harness component */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useClickOutside } from '@/hooks/useClickOutside';

function Box({ onOutside, enabled = true }) {
  const ref = useClickOutside(onOutside, enabled);
  return (
    <div>
      <div data-testid="box" ref={ref}>
        <button data-testid="inside">inside</button>
      </div>
      <button data-testid="outside">outside</button>
    </div>
  );
}

describe('useClickOutside', () => {
  it('fires when clicking outside the element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Box onOutside={onOutside} />);
    fireEvent.mouseDown(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not fire when clicking inside the element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Box onOutside={onOutside} />);
    fireEvent.mouseDown(getByTestId('inside'));
    fireEvent.mouseDown(getByTestId('box'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('responds to touchstart too', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Box onOutside={onOutside} />);
    fireEvent.touchStart(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<Box onOutside={onOutside} enabled={false} />);
    fireEvent.mouseDown(getByTestId('outside'));
    expect(onOutside).not.toHaveBeenCalled();
  });
});
