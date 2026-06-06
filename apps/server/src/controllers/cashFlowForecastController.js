const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const TermDeposit = require('../models/TermDeposit');
const ScheduledPayment = require('../models/ScheduledPayment');
const { generateAmortizationSchedule } = require('../utils/amortizationUtils');

const HORIZONS = { '30': 30, '60': 60, '90': 90 };

/**
 * Bucket helper: returns 0..bucketCount-1 for a date relative to today,
 * or -1 if outside the horizon.
 */
const bucketIndex = (dueDate, today, bucketDays, bucketCount) => {
  const diff = Math.floor(
    (new Date(dueDate).setHours(0, 0, 0, 0) - today) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0 || diff >= bucketDays * bucketCount) return -1;
  return Math.floor(diff / bucketDays);
};

/**
 * @desc    Forecast inflows vs outflows over a 30/60/90-day horizon.
 * @route   GET /api/cash-flow-forecast?horizon=90
 * @access  Private (Admin / view_reports)
 *
 * Inflows:
 *   - Loan EMI installments due (from amortization schedule, unpaid only)
 *   - Scheduled saving deposits (recurring transfers, projected occurrences)
 * Outflows:
 *   - Term deposits maturing (principal + projected profit)
 *   - Scheduled loan repayments (member-initiated standing instructions are
 *     internal transfers — neutral on tenant cash position, so excluded)
 *
 * Returns:
 *   {
 *     horizonDays, asOf,
 *     totals: { inflow, outflow, net },
 *     buckets: [{ label, startDate, endDate, inflow, outflow, net }],
 *     breakdown: { emiInflow, scheduledInflow, tdOutflow },
 *     upcoming: { largestInflows: [...], largestOutflows: [...] }
 *   }
 */
const getCashFlowForecast = async (req, res) => {
  try {
    const horizonRaw = String(req.query.horizon || '90');
    const horizonDays = HORIZONS[horizonRaw] || 90;
    const bucketDays = 10; // 30→3 buckets, 60→6 buckets, 90→9 buckets
    const bucketCount = horizonDays / bucketDays;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonEnd = new Date(today.getTime() + horizonDays * 86400000);

    const tenantQuery = { user: req.user.effectiveOwnerId };
    if (req.user.role === 'staff') {
      const branchScope = req.user.managedBranchId || req.user.branchId;
      if (branchScope) tenantQuery.branchId = branchScope;
    }

    // Initialise empty buckets
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = new Date(today.getTime() + i * bucketDays * 86400000);
      const end = new Date(
        today.getTime() + ((i + 1) * bucketDays - 1) * 86400000,
      );
      return {
        label: `Days ${i * bucketDays + 1}–${(i + 1) * bucketDays}`,
        startDate: start,
        endDate: end,
        inflow: 0,
        outflow: 0,
        net: 0,
      };
    });

    let emiInflow = 0;
    let scheduledInflow = 0;
    let tdOutflow = 0;

    const inflowEvents = [];
    const outflowEvents = [];

    // ── INFLOW 1: EMI installments due on active/overdue loans ─────────────
    const activeLoans = await Loan.find({
      ...tenantQuery,
      status: { $in: ['active', 'overdue'] },
    })
      .select(
        'principal rate duration emi totalAmount paidAmount startDate interestType customer',
      )
      .populate('customer', 'name')
      .lean();

    for (const loan of activeLoans) {
      let schedule;
      try {
        schedule = generateAmortizationSchedule(loan);
      } catch {
        continue;
      }
      const paidInstallments = Math.floor(
        (loan.paidAmount || 0) / (loan.emi || 1),
      );
      const unpaid = schedule.filter((s) => s.installment > paidInstallments);
      for (const inst of unpaid) {
        const idx = bucketIndex(inst.dueDate, today.getTime(), bucketDays, bucketCount);
        if (idx === -1) continue;
        buckets[idx].inflow += inst.amount;
        emiInflow += inst.amount;
        inflowEvents.push({
          kind: 'emi',
          dueDate: inst.dueDate,
          amount: inst.amount,
          label: `EMI #${inst.installment} — ${loan.customer?.name || 'Customer'}`,
          loanId: loan._id,
        });
      }
    }

    // ── INFLOW 2: Recurring saving deposits (standing instructions) ─────────
    const sched = await ScheduledPayment.find({
      ...tenantQuery,
      status: 'active',
      type: 'saving_deposit',
      nextExecutionDate: { $lte: horizonEnd },
    })
      .select('amount nextExecutionDate dayOfMonth executionCount maxExecutions member')
      .populate('member', 'name')
      .lean();

    for (const sp of sched) {
      let occurrence = new Date(sp.nextExecutionDate);
      occurrence.setHours(0, 0, 0, 0);
      let remaining = sp.maxExecutions
        ? Math.max(0, sp.maxExecutions - (sp.executionCount || 0))
        : Infinity;
      while (occurrence <= horizonEnd && remaining > 0) {
        const idx = bucketIndex(occurrence, today.getTime(), bucketDays, bucketCount);
        if (idx !== -1) {
          buckets[idx].inflow += sp.amount;
          scheduledInflow += sp.amount;
          inflowEvents.push({
            kind: 'scheduled_deposit',
            dueDate: new Date(occurrence),
            amount: sp.amount,
            label: `Scheduled deposit — ${sp.member?.name || 'Member'}`,
          });
        }
        // Advance to next month's same day, clamped to 1–28
        const next = new Date(occurrence);
        next.setMonth(next.getMonth() + 1);
        occurrence = next;
        remaining -= 1;
      }
    }

    // ── OUTFLOW: Term deposits maturing within horizon ─────────────────────
    const maturingTDs = await TermDeposit.find({
      ...tenantQuery,
      status: 'active',
      maturityDate: { $gte: today, $lte: horizonEnd },
    })
      .select('principal projectedProfit maturityDate depositNumber member')
      .populate('member', 'name')
      .lean();

    for (const td of maturingTDs) {
      const idx = bucketIndex(td.maturityDate, today.getTime(), bucketDays, bucketCount);
      if (idx === -1) continue;
      const payout = (td.principal || 0) + (td.projectedProfit || 0);
      buckets[idx].outflow += payout;
      tdOutflow += payout;
      outflowEvents.push({
        kind: 'td_maturity',
        dueDate: td.maturityDate,
        amount: payout,
        label: `${td.depositNumber} matures — ${td.member?.name || 'Member'}`,
        depositId: td._id,
      });
    }

    // Net per bucket
    for (const b of buckets) b.net = b.inflow - b.outflow;

    const totals = buckets.reduce(
      (acc, b) => ({
        inflow: acc.inflow + b.inflow,
        outflow: acc.outflow + b.outflow,
        net: acc.net + b.net,
      }),
      { inflow: 0, outflow: 0, net: 0 },
    );

    inflowEvents.sort((a, b) => b.amount - a.amount);
    outflowEvents.sort((a, b) => b.amount - a.amount);

    res.json({
      horizonDays,
      asOf: today,
      totals,
      buckets,
      breakdown: { emiInflow, scheduledInflow, tdOutflow },
      upcoming: {
        largestInflows: inflowEvents.slice(0, 8),
        largestOutflows: outflowEvents.slice(0, 8),
      },
    });
  } catch (error) {
    console.error('Cash Flow Forecast Error:', error);
    res.status(500).json({ message: 'Failed to compute cash flow forecast' });
  }
};

module.exports = { getCashFlowForecast };
