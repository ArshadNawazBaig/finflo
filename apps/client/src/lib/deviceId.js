/**
 * Stable per-install device id (NOT a secret) sent as the `X-Device-Id` header.
 * The server uses it so a re-login on the SAME device supersedes its previous
 * session — keeping the Active Sessions list to one row per device instead of a
 * stack of duplicate logins. Persisted in localStorage (web + native); survives
 * reloads. A user-agent string can't serve this role (identical across same-model
 * machines); a random per-install id is unique to this browser/app install.
 */
const KEY = 'finflo_device_id';

let cached = null;

const generate = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getDeviceId = () => {
  if (cached) return cached;
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = generate();
      localStorage.setItem(KEY, id);
    }
    cached = id;
    return id;
  } catch {
    // localStorage unavailable (e.g. hardened private mode) — use a volatile id
    // for the tab so requests still carry a (non-persistent) device id.
    if (!cached) cached = generate();
    return cached;
  }
};

export default getDeviceId;
