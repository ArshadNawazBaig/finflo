import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const isSidebarExpandedAtom = atomWithStorage('isSidebarExpanded', true);

export const userAtom = atom(JSON.parse(localStorage.getItem('user')) || null);
export const tokenAtom = atom(localStorage.getItem('user') || null);
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));

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
