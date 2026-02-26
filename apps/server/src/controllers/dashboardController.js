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

    // Exclude rejected loans from financial aggregations
    query.status = { $ne: 'rejected' };

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

    // Self-healing: Link orphan loans/repayments to branch if missing
    // This resolves discrepancies where global admin sees more profit than branch view
    try {
      const orphans = await Loan.find({
        user: req.user.effectiveOwnerId,
        branchId: { $exists: false },
      }).populate('customer', 'branchId');

      if (orphans.length > 0) {
        for (const loan of orphans) {
          if (loan.customer?.branchId) {
            await Loan.findByIdAndUpdate(loan._id, {
              branchId: loan.customer.branchId,
            });
            await Repayment.updateMany(
              { loan: loan._id, branchId: { $exists: false } },
              { branchId: loan.customer.branchId },
            );
          }
        }
      }
    } catch (e) {
      console.error('Self-healing failed:', e);
    }

    // 1. Repayment & Profit Aggregation
    const repaymentStats = await Repayment.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'loans',
          localField: 'loan',
          foreignField: '_id',
          as: 'loanDetails',
        },
      },
      { $unwind: '$loanDetails' },
      {
        $project: {
          amount: 1,
          date: 1,
          interestAmount: 1,
          loanPrincipal: '$loanDetails.principal',
          loanTotal: '$loanDetails.totalAmount',
        },
      },
      {
        $group: {
          _id: null,
          totalRepaid: { $sum: '$amount' },
          totalProfit: {
            $sum: {
              $cond: [
                { $ifNull: ['$interestAmount', false] },
                '$interestAmount',
                {
                  $multiply: [
                    '$amount',
                    {
                      $divide: [
                        { $subtract: ['$loanTotal', '$loanPrincipal'] },
                        {
                          $cond: [{ $eq: ['$loanTotal', 0] }, 1, '$loanTotal'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          currentMonthRepaid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', currentStart] },
                    { $lte: ['$date', currentEnd] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          prevMonthRepaid: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', prevStart] },
                    { $lte: ['$date', prevEnd] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
          currentMonthProfit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', currentStart] },
                    { $lte: ['$date', currentEnd] },
                  ],
                },
                {
                  $cond: [
                    { $ifNull: ['$interestAmount', false] },
                    '$interestAmount',
                    {
                      $multiply: [
                        '$amount',
                        {
                          $divide: [
                            { $subtract: ['$loanTotal', '$loanPrincipal'] },
                            {
                              $cond: [
                                { $eq: ['$loanTotal', 0] },
                                1,
                                '$loanTotal',
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          },
          prevMonthProfit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', prevStart] },
                    { $lte: ['$date', prevEnd] },
                  ],
                },
                {
                  $cond: [
                    { $ifNull: ['$interestAmount', false] },
                    '$interestAmount',
                    {
                      $multiply: [
                        '$amount',
                        {
                          $divide: [
                            { $subtract: ['$loanTotal', '$loanPrincipal'] },
                            {
                              $cond: [
                                { $eq: ['$loanTotal', 0] },
                                1,
                                '$loanTotal',
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          },
        },
      },
    ]);

    const {
      totalRepaid = 0,
      totalProfit = 0,
      currentMonthRepaid = 0,
      prevMonthRepaid = 0,
      currentMonthProfit = 0,
      prevMonthProfit = 0,
    } = repaymentStats[0] || {};

    const profitChange = calculatePercentageChange(
      currentMonthProfit,
      prevMonthProfit,
    );
    const repaidChange = calculatePercentageChange(
      currentMonthRepaid,
      prevMonthRepaid,
    );

    // 2. Loan Stats Aggregation
    const loanMatch = { user: query.user, status: { $ne: 'rejected' } };
    if (query.branchId !== undefined) loanMatch.branchId = query.branchId;
    const loanStatsAgg = await Loan.aggregate([
      {
        $match: loanMatch,
      },
      {
        $group: {
          _id: null,
          activeLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          outstandingAmount: { $sum: '$remainingAmount' },
          totalDisbursed: { $sum: '$principal' },
          currentMonthActive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $lte: ['$createdAt', currentEnd] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          prevMonthActive: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'active'] },
                    { $lte: ['$createdAt', prevEnd] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          prevMonthOutstanding: {
            $sum: {
              $cond: [{ $lte: ['$createdAt', prevEnd] }, '$remainingAmount', 0],
            },
          },
          prevMonthDisbursed: {
            $sum: {
              $cond: [{ $lte: ['$createdAt', prevEnd] }, '$principal', 0],
            },
          },
        },
      },
    ]);

    const {
      activeLoans = 0,
      outstandingAmount = 0,
      totalDisbursed = 0,
      prevMonthActive = 0,
      prevMonthOutstanding = 0,
      prevMonthDisbursed = 0,
    } = loanStatsAgg[0] || {};

    const loansChange = calculatePercentageChange(activeLoans, prevMonthActive);
    const outstandingChange = calculatePercentageChange(
      outstandingAmount,
      prevMonthOutstanding,
    );
    const disbursedChange = calculatePercentageChange(
      totalDisbursed,
      prevMonthDisbursed,
    );

    // 3. Member Stats Aggregation
    const Member = require('../models/Member');
    const memberMatch = { user: query.user };
    if (query.branchId !== undefined) memberMatch.branchId = query.branchId;
    const memberStatsAgg = await Member.aggregate([
      { $match: memberMatch },
      {
        $group: {
          _id: null,
          totalDeposits: { $sum: '$currentBalance' },
          totalInvested: { $sum: '$totalInvested' },
          totalWithdrawn: { $sum: '$totalWithdrawn' },
          totalMembers: { $sum: 1 },
        },
      },
    ]);

    const {
      totalDeposits = 0,
      totalInvested = 0,
      totalWithdrawnByMembers = 0,
      totalMembers = 0,
    } = (() => {
      const s = memberStatsAgg[0] || {};
      return {
        totalDeposits: s.totalDeposits || 0,
        totalInvested: s.totalInvested || 0,
        totalWithdrawnByMembers: s.totalWithdrawn || 0,
        totalMembers: s.totalMembers || 0,
      };
    })();

    // 4. Financial Transaction (Liquidity) Aggregation
    const ftBaseMatch = { user: req.user.effectiveOwnerId };
    if (query.branchId !== undefined) ftBaseMatch.branchId = query.branchId;
    const transactionStats = await FinancialTransaction.aggregate([
      { $match: ftBaseMatch },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
          },
          totalExpense: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
          totalLoanDisbursed: {
            $sum: { $cond: [{ $eq: ['$type', 'loan'] }, '$amount', 0] },
          },
          totalExpenses: {
            $sum: { $cond: [{ $eq: ['$category', 'expense'] }, '$amount', 0] },
          }, // for operating expenses
        },
      },
    ]);

    const {
      totalIncome = 0,
      totalExpense = 0,
      totalLoanDisbursed = 0,
      totalExpenses = 0,
    } = transactionStats[0] || {};

    // Liquidity = Total money in (deposits + repayments) minus money out (disbursements + withdrawals + expenses)
    const netLiquidity = Math.round(
      totalIncome - totalExpense - totalLoanDisbursed - totalWithdrawnByMembers,
    );
    const netProfit = Math.round(totalProfit);

    // 5. Recent Transactions
    const recentTransactions = await Repayment.find(query)
      .sort({ date: -1 })
      .limit(5)
      .populate('customer', 'name');

    // 6. Monthly History Chart Data (Aggregated)
    const historyRangeStart = startDate
      ? new Date(startDate)
      : getMonthDates(5).start;
    const historyRangeEnd = endDate ? new Date(endDate) : currentEnd;

    const txMatch = { user: req.user.effectiveOwnerId };
    if (query.branchId !== undefined) txMatch.branchId = query.branchId;
    const historicalMetrics = await FinancialTransaction.aggregate([
      {
        $match: {
          ...txMatch,
          date: { $gte: historyRangeStart, $lte: historyRangeEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          inflow: {
            $sum: {
              $cond: [{ $eq: ['$category', 'repayment'] }, '$amount', 0],
            },
          },
          deposits: {
            $sum: {
              $cond: [{ $eq: ['$category', 'investment'] }, '$amount', 0],
            },
          },
          expenses: {
            $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
          },
          outflow: {
            $sum: { $cond: [{ $eq: ['$type', 'loan'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch Profit separately from Repayments (contains interestAmount)
    const profitMetrics = await Repayment.aggregate([
      {
        $match: {
          ...txMatch,
          date: { $gte: historyRangeStart, $lte: historyRangeEnd },
        },
      },
      {
        $lookup: {
          from: 'loans',
          localField: 'loan',
          foreignField: '_id',
          as: 'loanDetails',
        },
      },
      { $unwind: '$loanDetails' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          profit: {
            $sum: {
              $cond: [
                { $ifNull: ['$interestAmount', false] },
                '$interestAmount',
                {
                  $multiply: [
                    '$amount',
                    {
                      $divide: [
                        {
                          $subtract: [
                            '$loanDetails.totalAmount',
                            '$loanDetails.principal',
                          ],
                        },
                        {
                          $cond: [
                            { $eq: ['$loanDetails.totalAmount', 0] },
                            1,
                            '$loanDetails.totalAmount',
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    // Map to the required format
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
    const monthlyHistory = historicalMetrics.map((m) => {
      const profitData = profitMetrics.find((p) => p._id === m._id);
      const [year, month] = m._id.split('-');
      return {
        name: monthNames[parseInt(month) - 1],
        inflow: m.inflow || 0,
        outflow: m.outflow || 0,
        deposits: m.deposits || 0,
        expenses: m.expenses || 0,
        profit: (profitData ? profitData.profit : 0) || 0,
      };
    });

    // 7. Predictive Forecast (Aggregated)
    const forecastHistory = [];
    if (!startDate) {
      const forecastStart = new Date(currentEnd);
      forecastStart.setDate(1);
      forecastStart.setMonth(forecastStart.getMonth() + 1);

      const forecastEnd = new Date(forecastStart);
      forecastEnd.setMonth(forecastEnd.getMonth() + 6);

      // This is a more complex projection, but we can approximate or use a separate logic
      // For now, let's keep the simplified projection but optimize it to avoid nested loops if possible.
      // However, since active loans are usually a manageable number, the current logic is OK if loans is already fetched.
      // But we can avoid the count query per loan.

      const loanForecastMatch = { user: query.user, status: 'active' };
      if (query.branchId !== undefined)
        loanForecastMatch.branchId = query.branchId;
      const activeLoansList = await Loan.find(loanForecastMatch);

      const today = new Date();
      for (let i = 1; i <= 6; i++) {
        const forecastMonthDate = new Date(
          today.getFullYear(),
          today.getMonth() + i,
          1,
        );
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
          // Approximate: if loan duration hasn't passed
          const monthsSinceStart =
            (monthStart.getFullYear() - loan.startDate.getFullYear()) * 12 +
            (monthStart.getMonth() - loan.startDate.getMonth());
          if (monthsSinceStart > 0 && monthsSinceStart <= loan.duration) {
            monthProjected += loan.emi;
          }
        }

        forecastHistory.push({
          name: monthNames[forecastMonthDate.getMonth()],
          projected: Math.round(monthProjected),
        });
      }
    }

    const totalProjected = forecastHistory.reduce(
      (sum, m) => sum + m.projected,
      0,
    );
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
          deposits: totalInvested,
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
    const { startDate, endDate, format, branchId } = req.query;
    const query = { user: req.user.effectiveOwnerId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Determine branch scope
    let branchScope = branchId;
    if (req.user.role === 'staff') {
      branchScope = req.user.isManager
        ? req.user.managedBranchId?.toString()
        : req.user.branchId?.toString();
    }

    if (branchScope) {
      query.branchId = branchScope;
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

    // Profit Calculation (Actual Interest Earned)
    const calculateProfit = (repaymentsList) => {
      return repaymentsList.reduce((sum, r) => {
        // If we have tracked interestAmount, use it (100% accurate)
        if (r.interestAmount !== undefined && r.interestAmount !== null) {
          return sum + r.interestAmount;
        }

        // Fallback for legacy repayments (pre-refactor)
        if (!r.loan || !r.loan.totalAmount || r.loan.totalAmount === 0)
          return sum;
        const totalInterest = r.loan.totalAmount - r.loan.principal;
        const profitRatio = totalInterest / r.loan.totalAmount;
        return sum + r.amount * profitRatio;
      }, 0);
    };
    const profit = calculateProfit(repayments);

    // Outflow Calculation (Loans disbursed in this period)
    const loanQuery = {
      user: req.user.effectiveOwnerId,
      status: { $ne: 'rejected' },
    };
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

    // Fetch Operating Expenses + Withdrawals for the period
    const expenseQuery = {
      ...query,
      type: 'expense',
    };
    const expenses = await FinancialTransaction.find(expenseQuery);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (format === 'json') {
      return res.json({
        repayments: combinedTransactions, // Sending combined list as 'repayments' to keep frontend contract similar
        summary: {
          inflow,
          deposits: totalDeposits,
          outflow,
          expenses: totalExpenses,
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
