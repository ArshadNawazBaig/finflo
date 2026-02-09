const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Customer = require('../models/Customer');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');

const getDashboardStats = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user._id;
    const { start: currentStart, end: currentEnd } = getMonthDates(0);
    const { start: prevStart, end: prevEnd } = getMonthDates(1);

    // 1. Total Profit (Interest portion of repayments)
    // Profit = Repayment Amount * (Total Interest / Total Amount)
    const repayments = await Repayment.find({ user: userId }).populate(
      'loan',
      'principal totalAmount',
    );

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
      user: userId,
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
    const loans = await Loan.find({ user: userId });
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

    // 5. Recent Transactions
    const recentTransactions = await Repayment.find({ user: userId })
      .sort({ date: -1 })
      .limit(5)
      .populate('customer', 'name');

    // 6. Monthly History Chart Data (Last 6 months)
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

    for (let i = 5; i >= 0; i--) {
      const { start, end } = getMonthDates(i);
      const monthRepayments = repayments.filter(
        (r) => r.date >= start && r.date <= end,
      );
      const monthTotal = monthRepayments.reduce((sum, r) => sum + r.amount, 0);

      const monthIndex = start.getMonth();
      monthlyHistory.push({
        name: monthNames[monthIndex],
        actual: monthTotal,
      });
    }

    // 7. Predictive Forecast (Next 6 months)
    const forecastHistory = [];
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
      const monthStart = new Date(today.getFullYear(), today.getMonth() + i, 1);
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

    // Total Projected for next 6 months
    const totalProjected = forecastHistory.reduce(
      (sum, m) => sum + m.projected,
      0,
    );

    // Calculate percentage change based on previous 6 months actuals vs next 6 months projection
    const totalLast6MonthsActual = monthlyHistory.reduce(
      (sum, m) => sum + m.actual,
      0,
    );
    const forecastPercentage = calculatePercentageChange(
      totalProjected,
      totalLast6MonthsActual,
    );

    res.json({
      stats: {
        profit: { amount: totalProfit, percentage: profitChange },
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
      },
      recentTransactions,
      analyticsData: [...monthlyHistory, ...forecastHistory],
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

module.exports = { getDashboardStats };
