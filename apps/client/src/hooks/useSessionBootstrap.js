import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { userAtom, memberAtom } from '@/atoms';
import { IS_NATIVE, IS_LANDING_DOMAIN } from '@/lib/constants';
import { refreshAccessToken } from '@/lib/sessionRefresh';
import { decodeJwt } from '@/lib/jwt';

/**
 * Re-mint the in-memory access token after a web page reload.
 *
 * On web neither the business user's nor the member's token is persisted to
 * localStorage (XSS hardening — see atoms.js), so after a reload the cached
 * principal has a profile but no token. This silently calls /auth/refresh
 * (authenticated by the httpOnly refresh cookie) and writes the fresh token back
 * onto the matching atom so the socket handshake, the Bearer header and proactive
 * expiry checks have a token again. Requests in the meantime authenticate via the
 * httpOnly access cookie, so the app is usable before this resolves.
 *
 * No-op on native (token persisted), on the public landing domain (no auth there
 * — a failed mint must never log a marketing visitor "out"), and when the cached
 * principal already has a token (a fresh login set it).
 *
 * Failure handling is deliberately conservative: only a DEFINITIVE auth rejection
 * (HTTP 401/403 — the refresh cookie is dead/revoked) drops the cached profile so
 * the route guards send the user to login. A transient failure (offline, CORS, a
 * server hiccup, or simply being on a public page) leaves the profile intact:
 * requests still authenticate via the httpOnly cookie, and the axios interceptor
 * ends a truly-dead session on the next real API call. (Nulling on any failure
 * caused spurious logouts — e.g. visiting the corporate landing page.)
 *
 * The returned token's `type` claim decides which atom to update; a per-mount
 * guard ensures each principal is bootstrapped at most once (no refresh loop if
 * both happen to be cached). Single-flight refresh dedupes.
 */
const useSessionBootstrap = () => {
  const [user, setUser] = useAtom(userAtom);
  const [member, setMember] = useAtom(memberAtom);
  const attemptedRef = useRef(null);

  useEffect(() => {
    if (IS_NATIVE || IS_LANDING_DOMAIN) return undefined;

    if (!attemptedRef.current) attemptedRef.current = new Set();
    const attempted = attemptedRef.current;
    const targets = [];
    if (user && !user.token && !attempted.has('user')) targets.push('user');
    if (member && !member.token && !attempted.has('member')) {
      targets.push('member');
    }
    if (targets.length === 0) return undefined;
    targets.forEach((t) => attempted.add(t));

    let active = true;
    refreshAccessToken()
      .then((token) => {
        if (!active) return;
        const type = decodeJwt(token)?.type;
        if (type === 'member') {
          setMember((prev) => (prev ? { ...prev, token } : prev));
        } else {
          setUser((prev) => (prev ? { ...prev, token } : prev));
        }
      })
      .catch((err) => {
        if (!active) return;
        // Only a definitive auth rejection means the session is truly gone. A
        // transient/network/CORS failure must NOT log the user out — keep the
        // cached profile; the httpOnly cookie still carries requests and the
        // axios interceptor ends a dead session on the next real API call.
        const status = err?.response?.status;
        if (status !== 401 && status !== 403) return;
        if (targets.includes('user')) setUser(null);
        if (targets.includes('member')) setMember(null);
      });

    return () => {
      active = false;
    };
  }, [user, member, setUser, setMember]);
};

export default useSessionBootstrap;
