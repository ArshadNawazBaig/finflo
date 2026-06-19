import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { IS_NATIVE } from '@/lib/constants';

export const isSidebarExpandedAtom = atomWithStorage('isSidebarExpanded', true);

// Token hardening for the persisted principal state. The REFRESH token is never
// written to localStorage on ANY platform — web rides the httpOnly refresh
// cookie, native keeps it in the OS secure enclave (Keychain/Keystore via
// lib/nativeRefresh). The ACCESS token is additionally kept out of localStorage
// on WEB (XSS hardening — it's re-minted by a silent /auth/refresh on reload,
// see useSessionBootstrap); native keeps the access token in storage because its
// Bearer flow reads it across reloads. Applied to both the business user and the
// member principal (both have revocable refresh sessions).
const tokenStrippingStorage = () => {
  const base = createJSONStorage(() => localStorage);
  return {
    ...base,
    setItem: (key, value) => {
      if (value && typeof value === 'object') {
        const sanitized = { ...value };
        delete sanitized.refreshToken; // never at rest in localStorage
        if (!IS_NATIVE) delete sanitized.token; // web: access token in memory only
        return base.setItem(key, sanitized);
      }
      return base.setItem(key, value);
    },
  };
};

export const userAtom = atomWithStorage('user', null, tokenStrippingStorage());
export const tokenAtom = atom((get) => get(userAtom)?.token || null);
// Auth presence keys off the cached principal OBJECT, not the token: on web the
// token is absent right after a reload (until the bootstrap refresh re-mints it).
export const isAuthenticatedAtom = atom((get) => !!get(userAtom));

export const memberAtom = atomWithStorage('member', null, tokenStrippingStorage());
export const memberTokenAtom = atom((get) => get(memberAtom)?.token || null);
export const isMemberAuthenticatedAtom = atom((get) => !!get(memberAtom));

// Set to true while we're handling an expired/invalid session, so the
// ErrorBoundary stays quiet and we don't flash an error screen during the
// brief window before the login redirect completes.
export const isRedirectingAtom = atom(false);

export const statsAtom = atom({
  income: 0,
  growth: 0,
  customers: 0,
  activeLoans: 0,
});

export const subscriptionAtom = atom({
  plan: 'Free',
  usage: {
    loans: 0,
    members: 0,
    branches: 0,
  },
  limits: null,
  loading: true,
});
export const unreadChatCountAtom = atom(0);
export const pendingMembersCountAtom = atom(0);
// Unread disputes badge (owner side for staff/admin, member side in the portal).
// Kept in sync by SocketContext via dispute:* socket events.
export const unreadDisputesCountAtom = atom(0);

// Global Notification state
export const notificationsAtom = atom([]);
export const unreadNotificationsCountAtom = atom(0);
