# Auth — revocable session layer

FinFlo auth is a **hybrid**: stateless short-lived **access** JWTs for the hot
path (verified on every request with no DB hit), backed by a stateful,
**revocable refresh-token** layer (the `Session` model) with **rotation +
reuse detection**. Pure stateless JWT can't be revoked — disqualifying for a
money app (no instant logout, no "log out all devices", no force-logout on
compromise). This keeps access verification stateless and pays the DB cost only
at refresh time.

## Pieces

| File | Role |
|------|------|
| [`models/Session.js`](src/models/Session.js) | One row per login (a rotation *family*). `currentJti` = the only valid refresh token; idle + absolute expiry; `revokedAt`/`revokedReason`; device/IP for the UI; TTL-pruned. Supports `User` and `Member` principals. |
| [`services/tokenService.js`](src/services/tokenService.js) | The engine: `signAccessToken`, `issueSession`, `rotateSession` (reuse → revoke family), `revokeByRefreshToken`, `revokeSession`, `revokeAllForPrincipal`, `listSessions`. |
| [`utils/authCookies.js`](src/utils/authCookies.js) | httpOnly `token`/`refresh_token` + readable `csrf_token` cookies; `verifyCsrf` (double-submit); `establishSession` login helper. |
| [`controllers/auth/authSession.js`](src/controllers/auth/authSession.js) | `POST /api/auth/refresh`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `POST /api/auth/logout-all`. |

`establishSession` is called from **every** live login path (email login, 2FA,
Google login/existing/register, email-verify auto-login) and `logoutUser`
revokes the session + clears all auth cookies.

## Rotation + reuse detection (the security core)

On each `POST /auth/refresh`: verify the refresh JWT → load its session → reject
if revoked / past absolute expiry / idle-expired → **the presented token must be
the current one** (`jti === currentJti` and hash matches). A mismatch means an
already-rotated token is being replayed (theft) → revoke this session **and
every sibling session of the principal**, and fail. On success, rotate (new
refresh token, `currentJti` bumped, `lastUsedAt` touched) — the **absolute
expiry is never extended**. Tested in
[`test/services/tokenService.test.js`](test/services/tokenService.test.js) +
[`test/controllers/authSession.test.js`](test/controllers/authSession.test.js).

## Config (env, with safe defaults)

| Var | Default | Notes |
|-----|---------|-------|
| `ACCESS_TOKEN_TTL` | `15m` | Web access-token lifetime (silent-refresh keeps it seamless). **Native business logins ignore this** and get the legacy 1d token — gated in `establishSession` via the `X-Client-Platform: native` header the client sends. |
| `REFRESH_ABSOLUTE_DAYS` | `30` | Absolute session cap. |
| `REFRESH_IDLE_DAYS` | `7` | Idle timeout (vs `lastUsedAt`). |
| `REFRESH_TOKEN_SECRET` | `JWT_SECRET` | Set a separate secret to limit blast radius. |
| `STEP_UP_TOKEN_TTL` | `15m` | Step-up (recent re-auth) proof lifetime for high-risk actions. |
| `STEP_UP_TOKEN_TTL_SECONDS` | `900` | Same value in seconds, returned to the client for its cache expiry. Keep in sync with `STEP_UP_TOKEN_TTL`. |
| `NATIVE_SHORT_TOKENS` | _(unset)_ | Rollout flip. Set `=true` (per environment) to give native (Capacitor) the short revocable 15m access token + silent body-refresh instead of the legacy 1d token. OFF by default; one flip to roll back. Enable only after the native body-refresh flow is device-verified. |

## Status

**Phase 1 (done):** engine + endpoints + session issuance on every login +
revocation/list/logout-all + CSRF + tests. **Additive & non-breaking** — the
legacy `token` cookie/JSON and 1d TTL are unchanged; existing clients and the
mobile Bearer flow are unaffected.

**Phase 2a (done) — web silent-refresh + Sessions UI.** The client now refreshes
transparently and exposes device management:
- [`lib/sessionRefresh.js`](../client/src/lib/sessionRefresh.js) — single-flight
  refresh on a **bare** axios client (can't re-enter the auth interceptors);
  echoes the `csrf_token` cookie in `x-csrf-token`.
- [`lib/axios.js`](../client/src/lib/axios.js) — the request interceptor refreshes
  *proactively* when the cached token is expired; the response interceptor
  refreshes *reactively* on a 401 and retries once (`_sessionRetried` guard). The
  new token is persisted onto the matching atom (decoded by `type`). Money-POST
  `Idempotency-Key` is preserved across a retry. Refresh failure → existing logout.
- [`components/admin/ActiveSessionsSection.jsx`](../client/src/components/admin/ActiveSessionsSection.jsx)
  — mounted in admin **Settings → Security**: lists devices, sign-out one,
  "log out others" (`keepCurrent`).
- Tests: `test/lib/sessionRefresh.test.js`, `test/lib/axiosSessionRefresh.test.js`
  (proactive/reactive/loop-guard/logout), `test/components/ActiveSessionsSection.test.jsx`.
- Still additive: dormant under today's 1d tokens (only fires on real expiry/401);
  the member portal has no session cookie yet, so member routes just log out as before.

**Phase 2b step 1 (done) — login mints session-bound access tokens.**
`establishSession` now returns the **access token** minted by `issueSession`
(carries `sid`, honours `ACCESS_TOKEN_TTL`), and every login path uses
`sessionResult?.accessToken || generateToken(user._id)` — so the login-issued
token is session-bound, with the legacy 1d token only as a fallback when the
session couldn't open. Wired into all 6 paths (email login, 2FA, Google
login/existing/register, email-verify). Still additive: at the default
`ACCESS_TOKEN_TTL=1d` behaviour is identical (tokens just gain a harmless `sid`
claim that `protect` ignores). Covered by `test/controllers/authLogin.test.js`
("mints a session-bound access token"). Server suite 566/566.

**Phase 2b step 2 (done) — access tokens are 15m, native-safe.** `ACCESS_TTL`
defaults to `15m` (env-overridable). Web logins + every refresh mint 15m tokens and
the client interceptor (Phase 2a) refreshes transparently. **Native is protected:**
the client sends `X-Client-Platform: native`, and `establishSession` returns a null
accessToken for native so the login path falls back to the legacy **1d** token —
native (which can't ride the cross-site refresh cookie) is unaffected, no 15-minute
logout loop. Covered by `test/controllers/authLogin.test.js` ("mints the legacy
token for a native client"). To override globally, set `ACCESS_TOKEN_TTL` in the
server env.

**Force-logout on password change (done).** `revokeAllForPrincipal` is called when a
password changes: `updatePassword` + `forceChangePassword` revoke the user's OTHER
sessions (keeping the current one via `currentRefreshSid`); `resetPassword`
(anonymous compromise-recovery) revokes **all**. Best-effort — never fails the
password update. Covered by `test/controllers/passwordSessionRevoke.test.js`.

**Phase 2b step 3 (done) — the web `localStorage` access token is gone (XSS fix).**
On web the business user's token is never written to `localStorage`; it lives only
in the in-memory atom and is re-minted on reload. Native + the member side are
unchanged.
- [`atoms.js`](../client/src/atoms.js) — `userAtom` uses a custom `createJSONStorage`
  whose `setItem` **strips `token`** (web only; passthrough on native). `isAuthenticatedAtom`
  now keys off the **user object**, not the token.
- [`hooks/useSessionBootstrap.js`](../client/src/hooks/useSessionBootstrap.js) — on web
  load, if the cached user has no token, silently `/auth/refresh` (httpOnly refresh
  cookie) to re-mint the in-memory token; a failed refresh drops the stale profile →
  guards send to `/login`. Called once from `App.jsx`.
- [`RequireAuth`](../client/src/components/RequireAuth.jsx) — bounces only on **no
  user**; token expiry is owned by the refresh interceptor (not a guard bounce).
- [`SocketContext`](../client/src/context/SocketContext.jsx) — reads the token from the
  atom store (not `localStorage`) and gates the badge fetches on **principal presence**;
  when no in-memory token exists yet, the socket handshake + requests authenticate via
  the httpOnly `token` cookie (both `protect` and the socket already accept it).
- Tests: `test/lib/userAtomStorage.test.js`, `test/hooks/useSessionBootstrap.test.jsx`,
  updated `test/components/RequireAuth.test.jsx`. Client suite 237/237.

The XSS exposure is now: a token is in JS memory only for the active tab/session
(not readable from storage by injected script across reloads), and on web it's never
at rest. Combined with step 2 (`15m`), a leaked token is short-lived **and** revocable.

**Member parity (done) — the member portal gets the same treatment.** Member
login (`loginMember`, `googleLogin`, `verifyLogin2FA`) now calls `establishSession`
(principalModel `Member`, tenant = owning business) and mints the session-bound
15m token for web / legacy 1d for native — same `X-Client-Platform` gate. `logoutMember`
revokes the session + clears cookies; member password change/reset revoke sessions
(`updatePassword`/`forceMemberChangePassword` keep current, `resetPassword` all).
Client: `memberAtom` shares the token-stripping storage (web), `useSessionBootstrap`
re-mints the member token by decoding the refreshed token's `type`, and
`RequireMemberAuth`/`RedirectIfMemberAuthenticated` key off the member **object**.
The shared `/auth/refresh` + the Phase 2a interceptor already drive member silent
refresh. Tests: `memberLogin.test.js` (session-bound + native), `memberPasswordRevoke.test.js`,
client `userAtomStorage`/`useSessionBootstrap` member cases. Server + client suites green.

**Member Sessions UI (done).** The three management handlers in `authSession.js`
are now **principal-agnostic** (`principalOf(req)` → `req.user` or `req.member`) and
mounted under both `/api/auth/*` (protect) and `/api/member-auth/{sessions,logout-all}`
(protectMember). `ActiveSessionsSection` takes a `basePath` prop and is mounted in
**MemberSettings → Security** (`basePath="/member-auth"`). Tested in `authSession.test.js`.

**Socket revoke (done).** `deleteSession` + `logoutAll` emit `session:revoked` to the
principal's socket room (`user_<id>`). Every live device re-validates by calling
`/auth/refresh`: the revoked device fails → logs out instantly; the others rotate and
stay (`SocketContext`). This closes the ≤15-minute window where a revoked device would
otherwise linger until its access token expired. No per-socket sid tracking needed —
the refresh outcome is the source of truth.

**Step-up authentication (done) — a fresh re-auth gates high-risk actions.** A
sensitive request must carry a short-lived `step_up` proof JWT (15m) in the
`x-step-up-token` header, minted by `POST /api/auth/reauth` (or
`/api/member-auth/reauth`) after the caller re-proves their **strongest enrolled
factor** — a TOTP code if 2FA is on, otherwise the account password. Mirrors the
transaction-PIN pattern.
- [`middleware/stepUpMiddleware.js`](src/middleware/stepUpMiddleware.js) —
  `requireRecentAuth({ when })`: principal-agnostic (serves `req.user` &
  `req.member`); on a missing/expired/mismatched proof answers **403
  `{ code: 'STEP_UP_REQUIRED', factor }`**; optional `when` predicate so
  `/updatedetails` is only challenged when the **login email actually changes**.
- [`controllers/auth/stepUp.js`](src/controllers/auth/stepUp.js) — `reauth`
  verifies the factor and mints the proof. Wrong factor → **422** (not 401) so
  the client's silent-refresh interceptor never mistakes it for an expired
  session. Rate-limited via `otpLimiter` on both reauth paths (`index.js`).
- **Gated routes** — Business (`protect`): `DELETE /auth/delete-account`,
  `PUT /auth/updatedetails` (email change only), and the staff-initiated money
  routes `POST /members/{admin/transfer, admin/transfer-share, :id/withdraw,
  :id/share-withdraw, distribute-profit, distribute-share-profit}` (before
  `idempotency`, so a rejected request reserves no key). Member (`protectMember`):
  `DELETE /member-auth/deleteaccount`, `PUT /member-auth/updatedetails` (email
  change only). **Deliberately NOT gated:** `/2fa/disable` + `/2fa/generate` —
  they already require the password in-controller, and forcing a *TOTP* to
  disable 2FA would lock out anyone who lost their authenticator.
- **Client** — [`lib/stepUp.js`](../client/src/lib/stepUp.js) (in-memory proof
  cache + single-flight `requestStepUp` window-event bridge),
  [`lib/axios.js`](../client/src/lib/axios.js) (attaches a valid proof on every
  request; on a 403 `STEP_UP_REQUIRED` opens the modal, retries once with the
  proof, preserving the money-POST `Idempotency-Key`; clears the proof on
  logout), [`components/StepUpModal.jsx`](../client/src/components/StepUpModal.jsx)
  (password/TOTP form per `factor`, posts to the right reauth endpoint). Prompts
  at most once per 15-min window. Tests: server `test/middleware/stepUp.test.js`
  + `test/controllers/stepUpReauth.test.js`; client `test/lib/stepUp.test.js` +
  `test/components/StepUpModal.test.jsx`. Server 592/592, client 252/252.

**Mobile body-refresh flow (done — behind `NATIVE_SHORT_TOKENS`, pending device verification).**
Native has no cookie jar, so the refresh token now travels in the login/refresh
**body**:
- Server: `establishSession` stashes the refresh token on `res.locals` and the
  response envelope folds it into the login body for native (one chokepoint, all
  9 login paths). The refresh endpoint returns the **rotated** token in the body
  when the request presented a body token. The 15m access token for native is
  gated behind `NATIVE_SHORT_TOKENS` (default off → legacy 1d).
- Client: [`lib/nativeRefresh.js`](../client/src/lib/nativeRefresh.js) is the one
  place that holds the native refresh token (on the principal atom for now —
  localStorage on native); [`lib/sessionRefresh.js`](../client/src/lib/sessionRefresh.js)
  sends the stored token in the body on native and persists the rotated one.
  `atoms.js` also strips `refreshToken` from web storage (defense-in-depth).
- Rollout: set `NATIVE_SHORT_TOKENS=true` on the target env, device-test (see
  below), then enable in prod. Roll back = unset the flag (no rebuild).
- Tests: `test/controllers/nativeLoginRefresh.test.js`, the body-token cases in
  `test/controllers/authSession.test.js`, client `test/lib/sessionRefreshNative.test.js`.

**Secure storage for the native refresh token (done).** The native refresh token
lives in the OS secure enclave — Keychain (iOS) / Keystore-backed encrypted
storage (Android) — via `@aparajita/capacitor-secure-storage`, never in
localStorage. [`lib/nativeRefresh.js`](../client/src/lib/nativeRefresh.js) is the
sole owner (dynamic-imports the plugin so web bundles/tests never load the native
bridge; every export no-ops on web + is best-effort). `atoms.js` strips
`refreshToken` from persisted state on every platform; `axios.js` captures the
login-body refresh token into the secure store and clears it on a dead session;
`useLogout` clears it on explicit logout. Requires `npx cap sync` (pod install /
gradle) + a native rebuild. Tests: client `test/lib/nativeRefresh.test.js`.

**Phase 2+ (remaining):**
1. **`kid`-based key rotation** (ops decision) — keyset config for graceful signing-key rollover.
