import { useMediaQuery } from './useMediaQuery';

/**
 * Returns true when the viewport width is below 768px (mobile breakpoint).
 * Built on top of useMediaQuery so it uses the native matchMedia API
 * instead of manually attaching resize listeners.
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}
