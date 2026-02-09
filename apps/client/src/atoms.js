import { atom } from 'jotai';

export const userAtom = atom(JSON.parse(localStorage.getItem('user')) || null);
export const tokenAtom = atom(localStorage.getItem('token') || null);
export const isAuthenticatedAtom = atom((get) => !!get(tokenAtom));

export const statsAtom = atom({
  income: 0,
  growth: 0,
  customers: 0,
  activeLoans: 0,
});
