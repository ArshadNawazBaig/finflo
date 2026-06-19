import { IS_NATIVE } from '@/lib/constants';

/**
 * Native (Capacitor) refresh-token storage — Keychain (iOS) / Keystore-backed
 * encrypted storage (Android) via @aparajita/capacitor-secure-storage.
 *
 * The web flow keeps the refresh token in an httpOnly cookie. Native has no
 * cookie jar, so the server delivers the refresh token in the login/refresh
 * BODY and we keep it HERE — at rest in the OS secure enclave, never in
 * localStorage (atoms.js strips `refreshToken` from persisted state on every
 * platform; axios captures it into this store on login, see writeRefreshToken).
 *
 * This is the ONE module that knows where the native refresh token lives. The
 * plugin is dynamically imported so web bundles/tests never load the native
 * bridge; every export no-ops on web (returns null / does nothing) and is
 * best-effort (a storage error never throws into the auth flow).
 */

// Prefixed so it can't collide with any other secure-storage consumer.
const REFRESH_KEY = 'finflo.refreshToken';

let pluginPromise = null;
const secureStorage = async () => {
  if (!pluginPromise) {
    pluginPromise = import('@aparajita/capacitor-secure-storage').then(
      (m) => m.SecureStorage,
    );
  }
  return pluginPromise;
};

/** The stored native refresh token, or null (web / not stored / error). */
export const readRefreshToken = async () => {
  if (!IS_NATIVE) return null;
  try {
    const ss = await secureStorage();
    const value = await ss.getItem(REFRESH_KEY);
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
};

/** Persist the native refresh token (login capture + rotation). */
export const writeRefreshToken = async (token) => {
  if (!IS_NATIVE || !token) return;
  try {
    const ss = await secureStorage();
    await ss.setItem(REFRESH_KEY, token);
  } catch {
    /* best-effort — never break auth on a storage error */
  }
};

/** Drop the stored refresh token (logout / dead session). */
export const clearRefreshToken = async () => {
  if (!IS_NATIVE) return;
  try {
    const ss = await secureStorage();
    await ss.remove(REFRESH_KEY);
  } catch {
    /* best-effort */
  }
};
