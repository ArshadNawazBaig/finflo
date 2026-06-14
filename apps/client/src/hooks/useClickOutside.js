import { useEffect, useRef } from 'react';

/**
 * Fire a callback when a pointer/touch event occurs outside the referenced
 * element. Replaces the `mousedown` + `ref.current.contains(...)` boilerplate
 * duplicated across Navbar, Sidebar, GlobalSearch, and many dropdowns.
 *
 * The handler is kept in a ref so the latest closure is always invoked without
 * re-binding the listener on every render.
 *
 * @template {HTMLElement} T
 * @param {(event: MouseEvent | TouchEvent) => void} handler - Called on an outside interaction.
 * @param {boolean} [enabled=true] - When false, the listener is detached (e.g. closed menus).
 * @returns {import('react').RefObject<T>} Ref to attach to the element to watch.
 *
 * @example
 * const ref = useClickOutside(() => setOpen(false), open);
 * return <div ref={ref}>…</div>;
 */
export function useClickOutside(handler, enabled = true) {
  const ref = useRef(null);
  const handlerRef = useRef(handler);

  // Keep the ref pointed at the latest handler without re-subscribing.
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return undefined;

    const listener = (event) => {
      const el = ref.current;
      if (!el || el.contains(event.target)) return;
      handlerRef.current(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [enabled]);

  return ref;
}

export default useClickOutside;
