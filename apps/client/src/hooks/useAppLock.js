import { useEffect, useState, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { memberAtom } from '@/atoms';
import api from '@/lib/axios';
import {
  isAppUnlocked,
  isAppLockPlatform,
  markAppUnlocked,
  clearAppUnlocked,
} from '@/lib/appLock';

/**
 * Drives the member-portal app lock on the native APK/iOS shells. Pairs the
 * existing transaction PIN with a sessionStorage unlock flag so that:
 *   - Cold launch with a valid session → locked (sessionStorage is empty).
 *   - Backgrounding the app → flag is cleared on `visibilitychange = hidden`,
 *     so resume re-locks.
 *   - Same-session reloads / route changes → unlocked, no extra prompts.
 *
 * Returns { isLocked, unlock }. `isLocked` is only ever true when the user is
 * member-authed, the platform is native, and they have a PIN configured.
 */
const useAppLock = () => {
  const member = useAtomValue(memberAtom);
  const [pinChecked, setPinChecked] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const enabled = isAppLockPlatform() && !!member?.token;

  // Probe PIN status once per session — the lock only engages if the member
  // has actually configured a PIN.
  useEffect(() => {
    if (!enabled) {
      setPinChecked(true);
      setHasPinSet(false);
      return;
    }
    let cancelled = false;
    api
      .get('/members/portal/pin-status')
      .then(({ data }) => {
        if (!cancelled) setHasPinSet(!!data?.hasPinSet);
      })
      .catch(() => {
        if (!cancelled) setHasPinSet(false);
      })
      .finally(() => {
        if (!cancelled) setPinChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Initial lock decision: as soon as we confirm PIN is set, lock unless the
  // session was already marked unlocked (e.g. user just logged in this tab).
  useEffect(() => {
    if (!enabled || !pinChecked) return;
    if (hasPinSet && !isAppUnlocked()) setIsLocked(true);
  }, [enabled, pinChecked, hasPinSet]);

  // Visibility transitions: hidden clears the flag, visible re-locks.
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearAppUnlocked();
      } else if (document.visibilityState === 'visible' && hasPinSet) {
        if (!isAppUnlocked()) setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () =>
      document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, hasPinSet]);

  const unlock = useCallback(() => {
    markAppUnlocked();
    setIsLocked(false);
  }, []);

  return {
    isLocked: enabled && hasPinSet && isLocked,
    unlock,
  };
};

export default useAppLock;
