// Per-user localStorage key marking business onboarding as complete. Keyed by
// user id so the flag never leaks across accounts on a shared browser (a global
// flag would wrongly skip onboarding for a fresh signup).
export const bizOnboardedKey = (userId) =>
  `finflo_biz_onboarded:${userId || 'anon'}`;
