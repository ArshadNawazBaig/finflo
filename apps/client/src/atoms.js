import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const isSidebarExpandedAtom = atomWithStorage('isSidebarExpanded', true);

export const userAtom = atomWithStorage('user', null);
export const tokenAtom = atom((get) => get(userAtom)?.token || null);
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));

export const memberAtom = atomWithStorage('member', null);
export const memberTokenAtom = atom((get) => get(memberAtom)?.token || null);
export const isMemberAuthenticatedAtom = atom((get) => !!get(memberTokenAtom));

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

// Global Notification state
export const notificationsAtom = atom([]);
export const unreadNotificationsCountAtom = atom(0);
