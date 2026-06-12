/**
 * Native push-notification registration for the Capacitor shells.
 *
 * The whole module is a NO-OP on the web (IS_NATIVE === false), so the web
 * bundle and the Vitest/jsdom tests are unaffected — and the heavy native
 * `@capacitor/push-notifications` code is only ever pulled in via a dynamic
 * import on a real device, never into the web chunk graph.
 *
 * Server endpoints (built in parallel) — token register/unregister:
 *   member app   → POST /device-tokens/register        | /device-tokens/unregister
 *   business app → POST /device-tokens/staff/register   | /device-tokens/staff/unregister
 * Both take `{ token, platform }` (register) / `{ token }` (unregister) and are
 * authenticated by the caller's existing session via the shared axios instance.
 */
import api from '@/lib/axios';
import { IS_NATIVE } from '@/lib/constants';

// Persist the last registered token so unregisterPush can target it even after
// a reload (the in-memory var is lost, localStorage survives). Module var is the
// fast path; localStorage is the durable fallback.
const TOKEN_STORAGE_KEY = 'finflo_push_token';
let lastToken = null;

// Listeners must be attached exactly once per app session — the
// PushNotifications plugin accumulates handlers otherwise.
let listenersAttached = false;

const rememberToken = (token) => {
  lastToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* localStorage may be unavailable — module var still works this session */
  }
};

const readToken = () => {
  if (lastToken) return lastToken;
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const forgetToken = () => {
  lastToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const registerEndpoint = (isStaff) =>
  isStaff ? '/device-tokens/staff/register' : '/device-tokens/register';

const unregisterEndpoint = (isStaff) =>
  isStaff ? '/device-tokens/staff/unregister' : '/device-tokens/unregister';

/**
 * Request permission, register with APNs/FCM, and POST the resulting device
 * token to the server. Inert on web. Never throws.
 */
export const registerPush = async ({ isStaff = false } = {}) => {
  if (!IS_NATIVE) return;

  try {
    const { PushNotifications } = await import(
      '@capacitor/push-notifications'
    );
    const { Capacitor } = await import('@capacitor/core');

    // Attach listeners before register() so we never miss the 'registration'
    // event, and only once per session.
    if (!listenersAttached) {
      listenersAttached = true;

      PushNotifications.addListener('registration', async (tokenData) => {
        try {
          const token = tokenData?.value;
          if (!token) return;
          rememberToken(token);
          await api.post(registerEndpoint(isStaff), {
            token,
            platform: Capacitor.getPlatform(),
          });
        } catch (err) {
          console.error('[push] token registration POST failed:', err);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registration error:', err);
      });

      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification) => {
          // Foreground delivery — leave handling to the OS presentation
          // options for now; log for diagnostics.
          console.info('[push] notification received:', notification);
        },
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action) => {
          // User tapped a notification. Deep-link routing can hook in here
          // later; log for now.
          console.info('[push] notification action performed:', action);
        },
      );
    }

    const perm = await PushNotifications.requestPermissions();
    if (perm?.receive !== 'granted') return;

    await PushNotifications.register();
  } catch (err) {
    console.error('[push] registerPush failed:', err);
  }
};

/**
 * Best-effort unregister: tell the server to drop the last token and detach the
 * plugin listeners. Inert on web. Never throws.
 */
export const unregisterPush = async ({ isStaff = false } = {}) => {
  if (!IS_NATIVE) return;

  try {
    const token = readToken();
    if (token) {
      try {
        await api.post(unregisterEndpoint(isStaff), { token });
      } catch (err) {
        console.error('[push] token unregister POST failed:', err);
      }
    }
    forgetToken();

    const { PushNotifications } = await import(
      '@capacitor/push-notifications'
    );
    await PushNotifications.removeAllListeners();
    listenersAttached = false;
  } catch (err) {
    console.error('[push] unregisterPush failed:', err);
  }
};
