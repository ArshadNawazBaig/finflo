/**
 * Step-up (recent re-authentication) proof handling — the client half of the
 * `requireRecentAuth` server gate.
 *
 * When a high-risk request is answered with `403 { code: 'STEP_UP_REQUIRED',
 * factor }`, the axios interceptor calls `requestStepUp(factor)`, which prompts
 * the user (via <StepUpModal>) to re-prove their strongest factor (a TOTP code
 * if 2FA is enabled, else their password). The resulting short-lived proof
 * token is cached IN MEMORY only (never persisted — same discipline as the
 * access token) and rides the `x-step-up-token` header on subsequent sensitive
 * requests until it expires (~15 min), so the user is prompted at most once per
 * window. Mirrors the transaction-PIN cache in `hooks/useTransactionPin`.
 */

let proofToken = null;
let proofExpiry = 0; // epoch ms (0 = none)

// Single-flight: concurrent sensitive requests that all 403 share ONE modal,
// then each retries with the single resulting token.
let inFlight = null;

/** The cached proof token if still valid, else null (and clears the stale one). */
export const getStepUpToken = () => {
  if (proofToken && Date.now() < proofExpiry) return proofToken;
  proofToken = null;
  proofExpiry = 0;
  return null;
};

/** Cache a freshly minted proof. `expiresIn` is seconds (a 5s safety buffer is applied). */
export const setStepUpToken = (token, expiresIn) => {
  proofToken = token;
  proofExpiry = Date.now() + Number(expiresIn || 0) * 1000 - 5000;
};

/** Drop the cached proof (e.g. on logout). */
export const clearStepUpToken = () => {
  proofToken = null;
  proofExpiry = 0;
};

/**
 * Ask the UI to collect a step-up re-auth and resolve with a fresh proof token.
 * Bridges the (non-React) axios interceptor to <StepUpModal> via a window
 * event. Rejects if the user cancels. Single-flight across concurrent callers.
 */
export const requestStepUp = (factor) => {
  // A proof that arrived while we were queueing (e.g. another request just
  // completed step-up) short-circuits the modal.
  const cached = getStepUpToken();
  if (cached) return Promise.resolve(cached);

  if (inFlight) return inFlight;

  inFlight = new Promise((resolve, reject) => {
    const detail = {
      factor: factor === '2fa' ? '2fa' : 'password',
      resolve: (token, expiresIn) => {
        setStepUpToken(token, expiresIn);
        resolve(token);
      },
      reject: (err) => reject(err || new Error('Step-up cancelled')),
    };
    window.dispatchEvent(new CustomEvent('stepup:required', { detail }));
  }).finally(() => {
    inFlight = null;
  });

  return inFlight;
};
