const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Customer = require('../models/Customer');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');

const FinancialTransaction = require('../models/FinancialTransaction');

const getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { startDate, endDate } = req.query;
    const query = { user: req.user.effectiveOwnerId };

    // Branch Segregation
    if (req.user.role === 'staff') {
      const branchScope = req.user.isManager
        ? req.user.managedBranchId
        : req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }

    let filterStart, filterEnd;
    if (startDate && endDate) {
      filterStart = new Date(startDate);
      filterEnd = new Date(endDate);
    } else {
      const { start, end } = getMonthDates(0);
      filterStart = start;
      filterEnd = end;
    }

    const { start: currentStart, end: currentEnd } = getMonthDates(0);
    const { start: prevStart, end: prevEnd } = getMonthDates(1);

    // 1. Total Profit (Interest portion of repayments)
    // Profit = Repayment Amount * (Total Interest / Total Amount)
    const repayments = await Repayment.find(query).populate(
      'loan',
      'principal totalAmount',
    );

    // Fetch Deposits (Investments)
    const depositQuery = { ...query, category: 'investment' };
    const deposits = await FinancialTransaction.find(depositQuery);

    const calculateProfit = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        if (!r.loan || !r.loan.totalAmount || r.loan.totalAmount === 0)
          return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };

    const totalProfit = calculateProfit(repayments);

    const prevRepayments = await Repayment.find({
      ...query,
      date: { $gte: prevStart, $lte: prevEnd },
    }).populate('loan', 'principal totalAmount');

    const currMonthRepayments = repayments.filter(
      (r) => r.date >= currentStart && r.date <= currentEnd,
    );
    const currMonthProfit = calculateProfit(currMonthRepayments);
    const prevMonthProfit = calculateProfit(prevRepayments);

    const profitChange = calculatePercentageChange(
      currMonthProfit,
      prevMonthProfit,
    );

    // 2. Active Loans Count & Outstanding Amount
    const loans = await Loan.find(query);
    const activeLoans = loans.filter((loan) => loan.status === 'active').length;

    const prevActiveLoans = loans.filter((loan) => {
      const createdDate = new Date(loan.createdAt);
      return createdDate <= prevEnd && loan.status === 'active';
    }).length;
    const loansChange = calculatePercentageChange(activeLoans, prevActiveLoans);

    // 3. Total Repaid
    const totalRepaid = loans.reduce(
      (sum, loan) => sum + (loan.paidAmount || 0),
      0,
    );

    const currMonthRepaid = repayments
      .filter((r) => r.date >= currentStart && r.date <= currentEnd)
      .reduce((sum, r) => sum + r.amount, 0);
    const prevMonthRepaid = prevRepayments.reduce(
      (sum, r) => sum + r.amount,
      0,
    );
    const repaidChange = calculatePercentageChange(
      currMonthRepaid,
      prevMonthRepaid,
    );

    // 4. Outstanding Amount
    const outstandingAmount = loans.reduce(
      (sum, loan) => sum + (loan.remainingAmount || 0),
      0,
    );

    const prevOutstanding = loans.reduce((sum, loan) => {
      const createdDate = new Date(loan.createdAt);
      if (createdDate > prevEnd) return sum;
      // This is a simplified calculation for history
      return sum + (loan.remainingAmount || 0);
    }, 0);
    const outstandingChange = calculatePercentageChange(
      outstandingAmount,
      prevOutstanding,
    );

    // 5. Banking Metrics (New for Banking Expert View)
    // 5a. Total Deposits (Liability): currentBalance = what we owe members
    const Member = require('../models/Member');
    const members = await Member.find(query);
    const totalDeposits = members.reduce(
      (sum, m) => sum + (m.currentBalance || 0),
      0,
    );

    // 5a-2. Total Invested (Lifetime capital inflow from members)
    const totalInvested = members.reduce(
      (sum, m) => sum + (m.totalInvested || 0),
      0,
    );

    // 5b. Total Disbursed (Asset Deployment): Sum of all loan principals
    const totalDisbursed = loans.reduce(
      (sum, l) => sum + (l.principal || 0),
      0,
    );
    // Previous month disbursed for trend
    const prevDisbursed = loans
      .filter((l) => new Date(l.createdAt) <= prevEnd)
      .reduce((sum, l) => sum + (l.principal || 0), 0);
    const disbursedChange = calculatePercentageChange(
      totalDisbursed,
      prevDisbursed,
    );

    // 5c. Net Cash Flow / Liquidity Position
    // Available Cash = (Invested + Repaid) - (Disbursed + Withdrawn + Expenses)
    const totalWithdrawn = members.reduce(
      (sum, m) => sum + (m.totalWithdrawn || 0),
      0,
    );

    // Fetch Operating Expenses only (exclude capital movements like disbursements/withdrawals
    // which are already accounted for via totalDisbursed and totalWithdrawn)
    const expenseQuery = {
      ...query,
      type: 'expense',
      category: {
        $in: [
          'rent',
          'salary',
          'utilities',
          'marketing',
          'maintenance',
          'fee',
          'other',
        ],
      },
    };
    const expenses = await FinancialTransaction.find(expenseQuery);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netLiquidity =
      totalInvested +
      totalRepaid -
      totalDisbursed -
      totalWithdrawn -
      totalExpenses;

    // Net Profit = Interest Earnings - Operating Expenses
    const netProfit = totalProfit - totalExpenses;

    // 5. Recent Transactions
    const recentTransactions = await Repayment.find(query)
      .sort({ date: -1 })
      .limit(5)
      .populate('customer', 'name');

    // 6. Monthly History Chart Data
    const monthlyHistory = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    if (startDate && endDate) {
      // If date range provided, group by month within that range
      const start = new Date(startDate);
      const end = new Date(endDate);
      let current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const mStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const mEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

        const monthRepayments = repayments.filter(
          (r) => r.date >= mStart && r.date <= mEnd,
        );
        const inflow = monthRepayments.reduce((sum, r) => sum + r.amount, 0);
        const profit = calculateProfit(monthRepayments);

        // Deposits
        const monthDeposits = deposits.filter(
          (d) => d.date >= mStart && d.date <= mEnd,
        );
        const depositAmount = monthDeposits.reduce(
          (sum, d) => sum + d.amount,
          0,
        );

        // Expenses
        const monthExpenses = expenses.filter(
          (e) => e.date >= mStart && e.date <= mEnd,
        );
        const expenseAmount = monthExpenses.reduce(
          (sum, e) => sum + e.amount,
          0,
        );

        // Outflow: Principal of loans disbursed in this month
        const monthLoans = loans.filter(
          (l) => l.startDate >= mStart && l.startDate <= mEnd,
        );
        const outflow = monthLoans.reduce(
          (sum, l) => sum + (l.principal || 0),
          0,
        );

        monthlyHistory.push({
          name: monthNames[current.getMonth()],
          inflow,
          outflow,
          profit,
          deposits: depositAmount,
          expenses: expenseAmount,
          actual: inflow, // Fallback for backward compatibility
        });

        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Default: Last 6 months
      for (let i = 5; i >= 0; i--) {
        const { start, end } = getMonthDates(i);
        const monthRepayments = repayments.filter(
          (r) => r.date >= start && r.date <= end,
        );
        const inflow = monthRepayments.reduce((sum, r) => sum + r.amount, 0);
        const profit = calculateProfit(monthRepayments);

        // Deposits
        const monthDeposits = deposits.filter(
          (d) => d.date >= start && d.date <= end,
        );
        const depositAmount = monthDeposits.reduce(
          (sum, d) => sum + d.amount,
          0,
        );

        // Expenses
        const monthExpenses = expenses.filter(
          (e) => e.date >= start && e.date <= end,
        );
        const expenseAmount = monthExpenses.reduce(
          (sum, e) => sum + e.amount,
          0,
        );

        // Outflow
        const monthLoans = loans.filter(
          (l) => l.startDate >= start && l.startDate <= end,
        );
        const outflow = monthLoans.reduce(
          (sum, l) => sum + (l.principal || 0),
          0,
        );

        const monthIndex = start.getMonth();
        monthlyHistory.push({
          name: monthNames[monthIndex],
          inflow,
          outflow,
          profit,
          deposits: depositAmount,
          expenses: expenseAmount,
          actual: inflow,
        });
      }
    }

    // 7. Predictive Forecast (Next 6 months - only if not custom range or if explicitly requested)
    const forecastHistory = [];
    if (!startDate) {
      const activeLoansList = loans.filter((l) => l.status === 'active');

      // Get current repayments count for each loan to know where we are
      const loanRepaymentsCount = JSON.parse(
        JSON.stringify(
          await Promise.all(
            activeLoansList.map(async (loan) => {
              const count = await Repayment.countDocuments({ loan: loan._id });
              return { id: loan._id.toString(), count };
            }),
          ),
        ),
      );

      const today = new Date();
      for (let i = 1; i <= 6; i++) {
        const forecastMonthDate = new Date(
          today.getFullYear(),
          today.getMonth() + i,
          1,
        );
        const forecastMonthName = monthNames[forecastMonthDate.getMonth()];
        const monthStart = new Date(
          today.getFullYear(),
          today.getMonth() + i,
          1,
        );
        const monthEnd = new Date(
          today.getFullYear(),
          today.getMonth() + i + 1,
          0,
        );

        let monthProjected = 0;

        for (const loan of activeLoansList) {
          const rCount =
            loanRepaymentsCount.find((rc) => rc.id === loan._id.toString())
              ?.count || 0;

          // Project future installments
          for (let inst = rCount + 1; inst <= loan.duration; inst++) {
            const dueDate = new Date(loan.startDate);
            dueDate.setMonth(dueDate.getMonth() + inst);

            if (dueDate >= monthStart && dueDate <= monthEnd) {
              monthProjected += loan.emi;
            }
          }
        }

        forecastHistory.push({
          name: forecastMonthName,
          projected: monthProjected,
        });
      }
    }

    // Total Projected for next 6 months
    const totalProjected = forecastHistory.reduce(
      (sum, m) => sum + m.projected,
      0,
    );

    // Calculate percentage change based on previous 6 months actuals vs next 6 months projection
    const totalLast6MonthsActual = monthlyHistory.reduce(
      (sum, m) => sum + (m.actual || 0),
      0,
    );
    const forecastPercentage = calculatePercentageChange(
      totalProjected,
      totalLast6MonthsActual,
    );

    res.json({
      stats: {
        profit: { amount: netProfit, percentage: profitChange },
        activeLoans: { count: activeLoans, percentage: loansChange },
        totalRepaid: { amount: totalRepaid, percentage: repaidChange },
        outstanding: {
          amount: outstandingAmount,
          percentage: outstandingChange,
        },
        forecast: {
          total6Months: totalProjected,
          percentage: forecastPercentage,
        },
        banking: {
          deposits: totalDeposits,
          disbursed: { amount: totalDisbursed, percentage: disbursedChange },
          liquidity: netLiquidity,
          expenses: totalExpenses,
        },
      },
      recentTransactions,
      analyticsData: [...monthlyHistory, ...forecastHistory],
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

const downloadStatement = async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    const query = { user: req.user.effectiveOwnerId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (req.user.role === 'staff') {
      const branchScope = req.user.isManager
        ? req.user.managedBranchId
        : req.user.branchId;
      if (branchScope) query.branchId = branchScope;
    }
    const repayments = await Repayment.find(query)
      .populate('customer', 'name')
      .populate('loan', 'loanId principal totalAmount')
      .sort({ date: -1 });

    // Fetch Deposits
    const depositQuery = { ...query, category: 'investment' };
    const deposits = await FinancialTransaction.find(depositQuery)
      .populate('member', 'name')
      .sort({ date: -1 });

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

    // Combine for statement
    // We'll normalize them to a common structure for the response
    const combinedTransactions = [
      ...repayments.map((r) => ({
        ...r.toObject(),
        type: 'repayment',
        entityName: r.customer?.name || 'Unknown',
        reference: r.loan?.loanId || 'N/A',
      })),
      ...deposits.map((d) => ({
        ...d.toObject(),
        type: 'deposit',
        entityName: d.member?.name || 'Unknown',
        reference: 'Deposit',
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary Metrics for the period
    const inflow = repayments.reduce((sum, r) => sum + r.amount, 0);

    // Profit Calculation (Interest portion)
    const calculateProfit = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        if (!r.loan || !r.loan.totalAmount || r.loan.totalAmount === 0)
          return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };
    const profit = calculateProfit(repayments);

    // Outflow Calculation (Loans disbursed in this period)
    const loanQuery = { user: req.user.effectiveOwnerId };
    if (startDate && endDate) {
      loanQuery.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (req.user.role === 'staff') {
      const branchScope = req.user.isManager
        ? req.user.managedBranchId
        : req.user.branchId;
      if (branchScope) loanQuery.branchId = branchScope;
    }
    const loans = await Loan.find(loanQuery);
    const outflow = loans.reduce((sum, l) => sum + (l.principal || 0), 0);

    if (format === 'json') {
      return res.json({
        repayments: combinedTransactions, // Sending combined list as 'repayments' to keep frontend contract similar, or we can rename
        summary: {
          inflow,
          deposits: totalDeposits,
          outflow,
          profit,
          totalTransactions: combinedTransactions.length,
        },
      });
    }

    let csv = 'Date,Description,Entity,Reference,Amount,Type\n';
    combinedTransactions.forEach((t) => {
      const date = new Date(t.date).toLocaleDateString();
      const description =
        t.type === 'repayment' ? 'Loan Repayment' : 'Member Deposit';
      const entity = t.entityName;
      const reference = t.reference;
      csv += `${date},"${description}","${entity}",${reference},${t.amount},${t.type}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=statement_${startDate}_to_${endDate}.csv`,
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error('Download Statement Error:', error);
    res.status(500).json({ message: 'Failed to generate statement' });
  }
};

module.exports = { getDashboardStats, downloadStatement };
