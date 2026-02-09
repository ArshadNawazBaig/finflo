const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const mongoose = require('mongoose');
const {
  calculatePercentageChange,
  getMonthDates,
} = require('../utils/reportUtils');

const getReportStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate monthly loans
    const monthlyLoans = await Loan.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: { $month: '$startDate' },
          total: { $sum: '$principal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Aggregate monthly repayments
    const monthlyRepayments = await Repayment.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format for frontend (transform month number to name)
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

    const formattedLoans = monthlyLoans.map((item) => ({
      name: monthNames[item._id - 1],
      value: item.total,
    }));

    const formattedRepayments = monthlyRepayments.map((item) => ({
      name: monthNames[item._id - 1],
      value: item.total,
    }));

    // Summary Metrics
    const totalLoans = await Loan.find({ user: userId });
    const totalVolume = totalLoans.reduce((sum, l) => sum + l.principal, 0);
    const activeLoansCount = totalLoans.filter(
      (l) => l.status === 'active',
    ).length;

    const { start: prevStart, end: prevEnd } = getMonthDates(1);
    const prevLoans = totalLoans.filter(
      (l) => new Date(l.createdAt) <= prevEnd,
    );
    const prevVolume = prevLoans.reduce((sum, l) => sum + l.principal, 0);
    const volumeChange = calculatePercentageChange(totalVolume, prevVolume);

    const allRepayments = await Repayment.find({ user: userId });
    const totalRepaid = allRepayments.reduce((sum, r) => sum + r.amount, 0);

    // Average Interest (weighted by principal)
    const avgInterest =
      totalLoans.length > 0
        ? (
            totalLoans.reduce((sum, l) => sum + l.rate * l.principal, 0) /
            totalVolume
          ).toFixed(1)
        : 0;

    const prevAvgInterest =
      prevLoans.length > 0
        ? (
            prevLoans.reduce((sum, l) => sum + l.rate * l.principal, 0) /
            prevVolume
          ).toFixed(1)
        : 0;
    const interestChange = calculatePercentageChange(
      Number(avgInterest),
      Number(prevAvgInterest),
    );

    // Collection Rate
    const totalDue = totalLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const collectionRate =
      totalDue > 0 ? ((totalRepaid / totalDue) * 100).toFixed(1) : 0;

    const prevDue = prevLoans.reduce((sum, l) => sum + l.totalAmount, 0);
    const prevRepaid = allRepayments
      .filter((r) => r.date <= prevEnd)
      .reduce((sum, r) => sum + r.amount, 0);
    const prevCollectionRate =
      prevDue > 0 ? ((prevRepaid / prevDue) * 100).toFixed(1) : 0;
    const collectionChange = calculatePercentageChange(
      Number(collectionRate),
      Number(prevCollectionRate),
    );

    const prevActiveLoans = prevLoans.filter(
      (l) => l.status === 'active',
    ).length;

    // Revenue Growth Calculation (Current Month vs Previous Month)
    const { start: currMonthStart, end: currMonthEnd } = getMonthDates(0);
    const currMonthRevenue = allRepayments
      .filter((r) => r.date >= currMonthStart && r.date <= currMonthEnd)
      .reduce((sum, r) => sum + r.amount, 0);

    const prevMonthRevenue = allRepayments
      .filter((r) => r.date >= prevStart && r.date <= prevEnd)
      .reduce((sum, r) => sum + r.amount, 0);

    const revenueGrowth = calculatePercentageChange(
      currMonthRevenue,
      prevMonthRevenue,
    );

    res.json({
      summary: {
        totalVolume,
        totalVolumeChange: volumeChange,
        avgInterest,
        avgInterestChange: interestChange,
        collectionRate,
        collectionRateChange: collectionChange,
        growth: `${revenueGrowth}%`,
        growthChange: revenueGrowth,
      },
      charts: {
        monthlyLoans:
          formattedLoans.length > 0
            ? formattedLoans
            : [{ name: 'None', value: 0 }],
        monthlyRepayments:
          formattedRepayments.length > 0
            ? formattedRepayments
            : [{ name: 'None', value: 0 }],
      },
    });
  } catch (error) {
    console.error('Report Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch report stats' });
  }
};

module.exports = { getReportStats };
