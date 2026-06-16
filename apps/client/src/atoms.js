import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const isSidebarExpandedAtom = atomWithStorage('isSidebarExpanded', true);

export const userAtom = atomWithStorage('user', null);
export const tokenAtom = atom((get) => get(userAtom)?.token || null);
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));

export const memberAtom = atomWithStorage('member', null);
export const memberTokenAtom = atom((get) => get(memberAtom)?.token || null);
export const isMemberAuthenticatedAtom = atom((get) => !!get(memberTokenAtom));

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
