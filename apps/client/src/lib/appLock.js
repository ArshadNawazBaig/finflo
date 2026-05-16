import { Capacitor } from '@capacitor/core';

// sessionStorage key — auto-clears on Capacitor force-quit (which is what we
// want: cold-launching the APK should re-lock), but persists across reloads.
const UNLOCK_KEY = 'finflo_app_unlocked';

// We only lock the native member shells (Android APK, iOS native build).
// On the web, locking would surprise desktop users every time they switch tabs.
export const isAppLockPlatform = () => Capacitor.isNativePlatform();

export const markAppUnlocked = () => {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* sessionStorage may be unavailable in private mode — silently no-op */
  }
};

export const clearAppUnlocked = () => {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
};

export const isAppUnlocked = () => {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
};
