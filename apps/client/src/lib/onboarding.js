// Per-user localStorage key marking business onboarding as complete. Keyed by
// user id so the flag never leaks across accounts on a shared browser (a global
// flag would wrongly skip onboarding for a fresh signup).
export const bizOnboardedKey = (userId) =>
  `finflo_biz_onboarded:${userId || 'anon'}`;

// Per-member equivalent for the member portal setup wizard. Keyed by member id
// so the flag never leaks across accounts on a shared device.
export const memberOnboardedKey = (memberId) =>
  `finflo_member_onboarded:${memberId || 'anon'}`;
