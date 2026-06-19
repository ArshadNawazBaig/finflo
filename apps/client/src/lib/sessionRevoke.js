/**
 * Decide whether a `session:revoked` socket event applies to THIS device, given
 * my own session id (the `sid` claim of my access token) and the event payload.
 *
 * The server names what changed so the kept/unaffected device doesn't needlessly
 * refresh (which, across multiple tabs, would replay a rotated refresh token and
 * trip reuse-detection — logging out the very session that was meant to survive):
 *   { revokedSids: [...] } → only those sessions were revoked
 *   { keptSid }            → everything EXCEPT this was revoked
 *   {}                     → full revocation (plain logout) → everyone re-validates
 *
 * When my own sid is unknown (e.g. no token yet, or a legacy token without a
 * `sid` claim), default to re-validating — that's always safe (a live session
 * refreshes fine; a dead one logs out correctly).
 *
 * @param {string|null} mySid - my session id, or null if unknown
 * @param {{ revokedSids?: string[], keptSid?: string }} [detail]
 * @returns {boolean} true → re-validate (refresh-or-logout); false → ignore
 */
export const isSessionRevokedForMe = (mySid, detail = {}) => {
  if (Array.isArray(detail?.revokedSids)) {
    return mySid ? detail.revokedSids.includes(mySid) : true;
  }
  if (detail?.keptSid) {
    return mySid ? detail.keptSid !== mySid : true;
  }
  return true; // no detail → full revocation / legacy → re-validate
};

export default isSessionRevokedForMe;
