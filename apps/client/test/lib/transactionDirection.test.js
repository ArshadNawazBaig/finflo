/**
 * lib/transactionDirection — the single source of truth for whether a
 * transaction renders as a credit (inflow, +) or debit (outflow, -). These
 * assertions mirror the server's balance-movement convention; if a sign here
 * is wrong, the UI shows money flowing the wrong way (the loan_disbursement
 * regression that prompted this helper).
 */
import { describe, it, expect } from 'vitest';
import {
  isCreditType,
  MEMBER_INFLOW_TYPES,
  MEMBER_OUTFLOW_TYPES,
} from '@/lib/transactionDirection';

describe('isCreditType — member perspective', () => {
  it.each([
    'deposit',
    'transfer_receive',
    'external_receive',
    'p2p_receive',
    'loan_disbursement',
    'profit',
  ])('treats %s as a credit (+, balance goes up)', (type) => {
    expect(isCreditType(type)).toBe(true);
  });

  it.each(['withdrawal', 'transfer_send', 'external_send', 'p2p_send'])(
    'treats %s as a debit (-, balance goes down)',
    (type) => {
      expect(isCreditType(type)).toBe(false);
    },
  );

  it('regression: loan disbursement raises the wallet, so it is a credit', () => {
    // The bug: loan_disbursement was missing from the inflow lists and rendered
    // as "- Rs.50,000" even though balanceAfter went 0 -> 50,000.
    expect(isCreditType('loan_disbursement')).toBe(true);
  });

  it('returns false for unknown / undefined types instead of throwing', () => {
    expect(isCreditType(undefined)).toBe(false);
    expect(isCreditType('something_new')).toBe(false);
  });

  it('inflow and outflow sets are disjoint', () => {
    const overlap = [...MEMBER_INFLOW_TYPES].filter((t) =>
      MEMBER_OUTFLOW_TYPES.has(t),
    );
    expect(overlap).toEqual([]);
  });
});

describe('isCreditType — share perspective', () => {
  it('share_deposit and share_profit are credits', () => {
    expect(isCreditType('share_deposit', 'share')).toBe(true);
    expect(isCreditType('share_profit', 'share')).toBe(true);
  });

  it('share_withdrawal is a debit', () => {
    expect(isCreditType('share_withdrawal', 'share')).toBe(false);
  });

  it('member-perspective types are not credits under the share lens', () => {
    expect(isCreditType('deposit', 'share')).toBe(false);
  });
});

describe('isCreditType — business-books (ledger) perspective', () => {
  it('income and credit are inflows on the business books', () => {
    expect(isCreditType('income', 'ledger')).toBe(true);
    expect(isCreditType('credit', 'ledger')).toBe(true);
  });

  it('expense, debit and loan are outflows on the business books', () => {
    expect(isCreditType('expense', 'ledger')).toBe(false);
    expect(isCreditType('debit', 'ledger')).toBe(false);
    expect(isCreditType('loan', 'ledger')).toBe(false);
  });
});
