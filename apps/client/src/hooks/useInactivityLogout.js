import { useEffect, useRef, useCallback } from 'react';
import { getDefaultStore } from 'jotai';
import { userAtom, memberAtom } from '@/atoms';
import { IS_NATIVE, APP_MODE } from '@/lib/constants';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const THROTTLE_MS = 1000; // Throttle activity resets to once per second

/**
 * Auto-logout hook for native APK builds.
 * Monitors user activity (touch, key, scroll) and logs the user out
 * after 5 minutes of inactivity, redirecting to the welcome screen.
 *
 * Only activates on native platforms (Capacitor Android/iOS) when a
 * user or member session is present.
 */
const useInactivityLogout = () => {
  const timerRef = useRef(null);
  const lastResetRef = useRef(Date.now());

  const isAuthenticated = () => {
    const store = getDefaultStore();
    const user = store.get(userAtom);
    const member = store.get(memberAtom);
    return !!(user || member);
  };

  const performLogout = useCallback(() => {
    if (!isAuthenticated()) return;

    const store = getDefaultStore();
    store.set(userAtom, null);
    store.set(memberAtom, null);

    toast.info('Session expired due to inactivity', {
      duration: 4000,
    });

    // Redirect to welcome screen on native, login page on web (fallback)
    if (IS_NATIVE) {
      window.location.href = '/welcome';
    } else if (APP_MODE === 'member') {
      window.location.href = '/member/login';
    } else {
      window.location.href = '/login';
    }
  }, []);

  const resetTimer = useCallback(() => {
    // Don't reset if not authenticated
    if (!isAuthenticated()) return;

    // Throttle: only reset if enough time has passed since last reset
    const now = Date.now();
    if (now - lastResetRef.current < THROTTLE_MS) return;
    lastResetRef.current = now;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT);
  }, [performLogout]);

  useEffect(() => {
    // Only activate on native platforms
    if (!IS_NATIVE) return;

    // Don't start if not authenticated
    if (!isAuthenticated()) return;

    const activityEvents = [
      'touchstart',
      'mousedown',
      'keydown',
      'scroll',
      'mousemove',
    ];

    // Start the initial timer
    timerRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT);

    // Attach listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer, performLogout]);
};

export default useInactivityLogout;
