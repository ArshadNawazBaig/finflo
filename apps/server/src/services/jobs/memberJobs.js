const cron = require('node-cron');
const Loan = require('../../models/Loan');
const Customer = require('../../models/Customer');
const Repayment = require('../../models/Repayment');
const Notification = require('../../models/Notification');
const SystemSettings = require('../../models/SystemSettings');
const FinancialTransaction = require('../../models/FinancialTransaction');
const { generateAmortizationSchedule } = require('../../utils/amortizationUtils');
const {
  createTransactionNotification,
} = require('../../utils/notificationHelper');
const { wrap } = require('../jobHealth');
const logger = require('../../utils/logger');

// ─── Fallback Constants (used only if config fails) ─────────────────────────
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const DEFAULT_LATE_FEE_CAP_PCT = 0.2; // never exceed 20% of remaining balance
// ─── Job 4: Trust Rating Recalculation ───────────────────────────────────────
/**
 * Runs weekly on Sunday at 02:00.
 * Recalculates trust rating for every customer from scratch based on their
 * full repayment history. This is a corrective measure to fix any drift
 * and also account for loan completions.
 */
const runTrustRatingRecalc = async () => {
  console.log('[CRON] runTrustRatingRecalc: starting...');

  try {
    const customers = await Customer.find({});
    let processed = 0;

    for (const customer of customers) {
      const loans = await Loan.find({ customer: customer._id });
      if (loans.length === 0) continue;

      let totalScore = 5.0; // Start from a neutral baseline

      for (const loan of loans) {
        if (
          !['active', 'overdue', 'completed', 'defaulted'].includes(loan.status)
        )
          continue;

        const repayments = await Repayment.find({ loan: loan._id }).sort({
          date: 1,
        });
        if (repayments.length === 0) continue;

        const schedule = generateAmortizationSchedule(loan);

        for (const repayment of repayments) {
          // Prefer the installmentNumber recorded at repayment time —
          // ceil(amount/emi) misclassifies partial/over-payments (e.g. a
          // 500 payment when EMI is 1000 maps to installment 1 regardless
          // of which installment was actually due).
          const installmentNumber =
            repayment.installmentNumber ||
            Math.ceil((repayment.amount || 0) / (loan.emi || 1));
          const schedItem = schedule.find(
            (s) => s.installment === installmentNumber,
          );
          if (!schedItem) continue;

          const dueDate = new Date(schedItem.dueDate);
          const graceDue = new Date(dueDate);
          graceDue.setDate(graceDue.getDate() + DEFAULT_GRACE_PERIOD_DAYS);

          const paymentDate = new Date(repayment.date);
          const isOnTime = paymentDate <= graceDue;
          totalScore += isOnTime ? 0.2 : -0.5;
        }

        // Bonus for fully paid loans
        if (loan.status === 'completed') totalScore += 1.0;
        // Penalty for defaults
        if (loan.status === 'defaulted') totalScore -= 2.0;
        // Penalty for overdue loans
        if (loan.status === 'overdue') totalScore -= 0.5;
      }

      const newRating = Math.min(
        10,
        Math.max(0, Math.round(totalScore * 10) / 10),
      );
      await Customer.findByIdAndUpdate(customer._id, {
        trustRating: newRating,
      });
      processed++;
    }

    console.log(
      `[CRON] runTrustRatingRecalc: recalculated ${processed} customer(s).`,
    );
  } catch (err) {
    console.error('[CRON] runTrustRatingRecalc ERROR:', err);
    throw err;
  }
};

// ─── Job 11: Member Balance Reconciliation ───────────────────────────────────
/**
 * Runs daily at 05:00 (after TD maturity, before scheduled payments).
 * Rebuilds currentBalance + totalInvested/totalWithdrawn/totalProfit for every
 * member from the ledger (Investment + ProfitDistribution) — the authoritative
 * source. Cached aggregates can drift if any future write path is asymmetric
 * (see commit history); this job sweeps drift before it accumulates.
 *
 * Implementation:
 *   - Two aggregation queries roll up the ledger per-member in one shot.
 *   - We cursor through Members and queue bulkWrite ops in 500-row batches.
 *   - 10k members ⇒ ~2 aggs + 1 cursor + ~20 bulk writes ≈ seconds, not minutes.
 */
const runMemberBalanceReconcile = async () => {
  console.log('[CRON] runMemberBalanceReconcile: starting...');

  try {
    const Member = require('../../models/Member');
    const Investment = require('../../models/Investment');
    const ProfitDistribution = require('../../models/ProfitDistribution');

    // Roll up Investment ledger per member (current account only, exclude
    // Reversed). $cond keeps deposit/withdrawal sums separate so we preserve
    // the same numbers the Member doc tracks.
    const invAgg = await Investment.aggregate([
      {
        $match: {
          accountType: 'current',
          status: { $ne: 'Reversed' },
        },
      },
      {
        $group: {
          _id: '$member',
          totalInvested: {
            $sum: {
              $cond: [
                { $in: ['$type', ['deposit', 'transfer_receive']] },
                '$amount',
                0,
              ],
            },
          },
          totalWithdrawn: {
            $sum: {
              $cond: [
                { $in: ['$type', ['withdrawal', 'transfer_send']] },
                '$amount',
                0,
              ],
            },
          },
          totalLoanProceeds: {
            $sum: {
              $cond: [{ $eq: ['$type', 'loan_disbursement'] }, '$amount', 0],
            },
          },
        },
      },
    ]);

    // Only 'regular' profit lands in currentBalance. 'share' lives in
    // shareBalance, 'saving' in savingBalance, and 'term_deposit' is baked
    // into the matching Investment(deposit) at maturity.
    const profitAgg = await ProfitDistribution.aggregate([
      {
        $match: {
          type: 'regular',
          status: { $ne: 'Failed' },
        },
      },
      {
        $group: {
          _id: '$member',
          totalProfit: { $sum: '$amount' },
        },
      },
    ]);

    // Build a fast lookup table keyed by memberId string.
    const ledger = new Map();
    for (const row of invAgg) {
      ledger.set(row._id.toString(), {
        totalInvested: row.totalInvested,
        totalWithdrawn: row.totalWithdrawn,
        totalLoanProceeds: row.totalLoanProceeds,
        totalProfit: 0,
      });
    }
    for (const row of profitAgg) {
      const key = row._id.toString();
      const entry = ledger.get(key) || {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalLoanProceeds: 0,
        totalProfit: 0,
      };
      entry.totalProfit = row.totalProfit;
      ledger.set(key, entry);
    }

    const BATCH = 500;
    let scanned = 0;
    let fixed = 0;
    let ops = [];

    const cursor = Member.find({})
      .select(
        '_id currentBalance totalInvested totalLoanProceeds totalWithdrawn totalProfit',
      )
      .cursor();

    for await (const member of cursor) {
      scanned++;

      const entry = ledger.get(member._id.toString()) || {
        totalInvested: 0,
        totalWithdrawn: 0,
        totalLoanProceeds: 0,
        totalProfit: 0,
      };
      // Loan proceeds back the wallet too (not capital, but spendable).
      const expectedBalance =
        entry.totalInvested +
        entry.totalLoanProceeds -
        entry.totalWithdrawn +
        entry.totalProfit;

      const drift =
        Math.abs(expectedBalance - (member.currentBalance || 0)) > 1 ||
        Math.abs(entry.totalInvested - (member.totalInvested || 0)) > 1 ||
        Math.abs(entry.totalLoanProceeds - (member.totalLoanProceeds || 0)) > 1 ||
        Math.abs(entry.totalWithdrawn - (member.totalWithdrawn || 0)) > 1 ||
        Math.abs(entry.totalProfit - (member.totalProfit || 0)) > 1;

      if (!drift) continue;

      ops.push({
        updateOne: {
          filter: { _id: member._id },
          update: {
            $set: {
              currentBalance: Math.round(expectedBalance),
              totalInvested: Math.round(entry.totalInvested),
              totalLoanProceeds: Math.round(entry.totalLoanProceeds),
              totalWithdrawn: Math.round(entry.totalWithdrawn),
              totalProfit: Math.round(entry.totalProfit),
            },
          },
        },
      });
      fixed++;

      if (ops.length >= BATCH) {
        await Member.bulkWrite(ops, { ordered: false });
        ops = [];
      }
    }

    if (ops.length) {
      await Member.bulkWrite(ops, { ordered: false });
    }

    console.log(
      `[CRON] runMemberBalanceReconcile: scanned ${scanned}, fixed ${fixed} member(s).`,
    );
  } catch (err) {
    console.error('[CRON] runMemberBalanceReconcile ERROR:', err);
    throw err;
  }
};

// ─── Document Expiry Scan ────────────────────────────────────────────────────
// Daily sweep over Customer and Member document arrays. Two responsibilities:
//   1. Auto-flip status to "Expired" when expiryDate < now (so the UI shows
//      stale CNICs/POAs without the admin having to remember).
//   2. Surface 30-day and 7-day reminders to the member as in-app
//      notifications. Each reminder is stamped on the doc so we never
//      re-fire the same reminder on subsequent runs.
const runDocumentExpiryScan = async () => {
  try {
    const Member = require('../../models/Member');
    const Customer = require('../../models/Customer');
    const {
      createTransactionNotification,
    } = require('../../utils/notificationHelper');

    const now = new Date();
    const ms30d = 30 * 24 * 3600 * 1000;
    const ms7d = 7 * 24 * 3600 * 1000;

    let expiredFlipped = 0;
    let reminders30d = 0;
    let reminders7d = 0;

    // Pull only docs that *could* need action — those with an expiryDate
    // and a non-Rejected status. Rejected docs are dead anyway.
    const memberCursor = Member.find({
      'documents.expiryDate': { $exists: true, $ne: null },
      'documents.status': { $in: ['Pending', 'Verified'] },
    }).cursor();

    for await (const member of memberCursor) {
      let dirty = false;
      for (const doc of member.documents) {
        if (!doc.expiryDate || doc.status === 'Rejected') continue;
        const exp = new Date(doc.expiryDate);
        const diff = exp.getTime() - now.getTime();

        // (1) Auto-flip past-due to Expired
        if (diff <= 0 && doc.status !== 'Expired') {
          doc.status = 'Expired';
          dirty = true;
          expiredFlipped++;
          // Mirror onto the linked Customer doc if any
          if (member.customer) {
            await Customer.updateOne(
              { _id: member.customer, 'documents._id': doc._id },
              { $set: { 'documents.$.status': 'Expired' } },
            );
          }
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: `${doc.type} expired`,
              message: `Your ${doc.type} on file has expired. Please upload a replacement to remain verified.`,
              type: 'warning',
              branchId: member.branchId,
              action: 'document_expired',
              metadata: { docId: doc._id, type: doc.type },
            });
          } catch (_) {
            // Don't let notification failures break the sweep.
          }
          continue;
        }

        // (2) 30-day reminder (fired once)
        if (
          diff > 0 &&
          diff <= ms30d &&
          diff > ms7d &&
          !doc.expiryReminder30dSentAt
        ) {
          doc.expiryReminder30dSentAt = now;
          dirty = true;
          reminders30d++;
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: `${doc.type} expires in 30 days`,
              message: `Your ${doc.type} expires on ${exp.toLocaleDateString()}. Upload a fresh copy before then.`,
              type: 'info',
              branchId: member.branchId,
              action: 'document_expiry_reminder',
              metadata: { docId: doc._id, type: doc.type, daysOut: 30 },
            });
          } catch (_) {
            /* swallow */
          }
        }

        // (3) 7-day reminder (fired once)
        if (diff > 0 && diff <= ms7d && !doc.expiryReminder7dSentAt) {
          doc.expiryReminder7dSentAt = now;
          dirty = true;
          reminders7d++;
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: `${doc.type} expires this week`,
              message: `Your ${doc.type} expires on ${exp.toLocaleDateString()}. Please replace it as soon as possible.`,
              type: 'warning',
              branchId: member.branchId,
              action: 'document_expiry_reminder',
              metadata: { docId: doc._id, type: doc.type, daysOut: 7 },
            });
          } catch (_) {
            /* swallow */
          }
        }
      }
      if (dirty) await member.save();
    }

    // Customers without a Member link still need their docs flipped to
    // Expired (so they show in the verification queue correctly). We don't
    // fire member-side reminders for them.
    const custResult = await Customer.updateMany(
      {
        'documents.expiryDate': { $lt: now },
        'documents.status': { $in: ['Pending', 'Verified'] },
      },
      { $set: { 'documents.$[doc].status': 'Expired' } },
      {
        arrayFilters: [
          {
            'doc.expiryDate': { $lt: now },
            'doc.status': { $in: ['Pending', 'Verified'] },
          },
        ],
      },
    );

    console.log(
      `[CRON] runDocumentExpiryScan: ${expiredFlipped} member docs expired, ${reminders30d}/30d + ${reminders7d}/7d reminders fired, ${custResult.modifiedCount || 0} customer docs flipped.`,
    );
  } catch (err) {
    console.error('[CRON] runDocumentExpiryScan ERROR:', err);
    throw err;
  }
};

// ─── Job: Credit Score Refresh ────────────────────────────────────────────────
/**
 * Recompute every active customer's credit-score snapshot daily so scores stay
 * current even between repayment/default events (e.g. tenure ageing, group
 * standing changes). Best-effort per customer — one failure never aborts the run.
 */
const runCreditScoreRefresh = async () => {
  console.log('[CRON] runCreditScoreRefresh: starting...');
  try {
    const { refreshCreditScore } = require('../creditScoringService');
    const customers = await Customer.find({ status: 'Active' }).select('_id');
    let processed = 0;
    for (const customer of customers) {
      try {
        await refreshCreditScore(customer._id);
        processed += 1;
      } catch (e) {
        console.error(
          `[CRON] runCreditScoreRefresh: ${customer._id} failed:`,
          e.message,
        );
        if (process.env.VERCEL === '1') throw e;
      }
    }
    console.log(`[CRON] runCreditScoreRefresh: ${processed} customer(s) scored.`);
  } catch (err) {
    console.error('[CRON] runCreditScoreRefresh ERROR:', err);
    throw err;
  }
};

// ─── Initializer ─────────────────────────────────────────────────────────────

module.exports = {
  runTrustRatingRecalc,
  runMemberBalanceReconcile,
  runDocumentExpiryScan,
  runCreditScoreRefresh,
};
