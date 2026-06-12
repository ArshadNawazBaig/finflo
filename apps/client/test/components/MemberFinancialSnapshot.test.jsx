import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../helpers/render';
import MemberFinancialSnapshot from '@/components/member/MemberFinancialSnapshot';

const baseMember = {
  currentBalance: 5000,
  savingBalance: 3000,
  shareBalance: 2000,
  totalInvested: 12000,
  totalSavingProfit: 800,
  creditLimit: 50000,
  creditScore: {
    score: 720,
    grade: 'Good',
    factors: ['On-time repayments boost your score'],
  },
};

describe('MemberFinancialSnapshot', () => {
  it('masks all money values until the eye toggle is pressed', () => {
    renderWithProviders(<MemberFinancialSnapshot member={baseMember} />);

    // Hidden by default — masked placeholders present, real total absent.
    expect(screen.getAllByText('******').length).toBeGreaterThan(0);
    expect(screen.queryByText(/10,000/)).toBeNull();

    fireEvent.click(screen.getByLabelText('Show values'));

    // 5000 + 3000 + 2000 = 10,000 total balance now visible.
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });

  it('shows the active-loan block with repaid progress and fires onRepay', () => {
    const onRepay = vi.fn();
    const member = {
      ...baseMember,
      activeLoan: {
        _id: 'loan1',
        remainingAmount: 4000,
        totalAmount: 10000,
        paidAmount: 6000,
        emi: 1200,
        status: 'active',
      },
    };
    renderWithProviders(
      <MemberFinancialSnapshot member={member} onRepay={onRepay} />,
    );

    expect(screen.getByText('Active Loan')).toBeInTheDocument();
    expect(screen.getByText('Monthly Installment')).toBeInTheDocument();
    // paidAmount/totalAmount = 6000/10000 = 60%.
    expect(screen.getByText('60%')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Repay'));
    expect(onRepay).toHaveBeenCalledTimes(1);
  });

  it('shows the encouraging borrow state and fires onRequestLoan when no active loan', () => {
    const onRequestLoan = vi.fn();
    renderWithProviders(
      <MemberFinancialSnapshot
        member={baseMember}
        onRequestLoan={onRequestLoan}
      />,
    );

    expect(screen.getByText('Borrowing Power')).toBeInTheDocument();
    expect(screen.getByText('Borrow up to')).toBeInTheDocument();

    fireEvent.click(screen.getByText('New request'));
    expect(onRequestLoan).toHaveBeenCalledTimes(1);
  });

  it('renders the credit score and grade band', () => {
    renderWithProviders(<MemberFinancialSnapshot member={baseMember} />);
    expect(screen.getByText('720')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(
      screen.getByText('On-time repayments boost your score'),
    ).toBeInTheDocument();
  });

  it('falls back to a Fair score when creditScore is missing', () => {
    const { creditScore, ...noScore } = baseMember;
    void creditScore;
    renderWithProviders(<MemberFinancialSnapshot member={noScore} />);
    expect(screen.getByText('550')).toBeInTheDocument();
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });
});
