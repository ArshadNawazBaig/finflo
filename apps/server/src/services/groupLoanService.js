const mongoose = require('mongoose');
const LoanGroup = require('../models/LoanGroup');
const GroupLoan = require('../models/GroupLoan');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const loanRepaymentService = require('./loanRepaymentService');
const { disburseLoan, settleLoanRenewal } = require('./loanDisbursementService');
const { computeCreditScore } = require('./creditScoringService');
const { computeLoanTerms } = require('../utils/loanMath');
const { calculateRiskScore } = require('../utils/riskService');
const { roundMoney } = require('../utils/money');
const { getDefaultBranchId } = require('../utils/branchUtils');
const { logActivity } = require('../controllers/activityLogController');
const logger = require('../utils/logger');

// A NotFound thrown from a service is mapped to 404 by the controller (so an
// unowned group/loan never leaks its existence). A ValidationError maps to 400.
class NotFoundError extends Error {}
class ValidationError extends Error {}

const short = (id) => id.toString().slice(-6).toUpperCase();

// Branch narrowing for staff: a branch-scoped staff user must not read or move
// money on a group/group-loan in a different branch of the same tenant. Mirrors
// groupController.scopeFor and the loans controller. Admins/super-admins get {}.
const branchScopeFor = (req) => {
  if (req.user.role === 'staff') {
    const branch = req.user.managedBranchId || req.user.branchId;
    if (branch) return { branchId: branch };
  }
  return {};
};

/**
 * Roll each sub-loan's state up to its GroupLoan, and (under a joint guarantee)
 * flag the LoanGroup `at_risk` when any member is overdue/defaulted. Safe to
 * call with or without a session — the crons call it outside a transaction.
 */
const recomputeGroupStatus = async (groupLoanId, session = null) => {
  const groupLoan = await GroupLoan.findById(groupLoanId).session(session);
  if (!groupLoan) return null;

  const loanIds = groupLoan.allocations.map((a) => a.loan).filter(Boolean);
  const loans = await Loan.find({ _id: { $in: loanIds } }).session(session);

  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalLateFees = 0;
  let anyOverdue = false;
  let anyDefaulted = false;
  let allDone = loans.length > 0;
  for (const l of loans) {
    totalPaid += l.paidAmount || 0;
    totalOutstanding += l.remainingAmount || 0;
    totalLateFees += l.lateFeeAmount || 0;
    if (l.status === 'overdue') anyOverdue = true;
    if (l.status === 'defaulted') anyDefaulted = true;
    if (l.status !== 'completed') allDone = false;
  }

  let status = 'active';
  if (allDone) status = 'completed';
  else if (anyDefaulted) status = 'defaulted';
  else if (anyOverdue) status = 'overdue';

  groupLoan.totalPaid = roundMoney(totalPaid);
  groupLoan.totalOutstanding = roundMoney(totalOutstanding);
  groupLoan.totalLateFees = roundMoney(totalLateFees);
  groupLoan.status = status;
  await groupLoan.save({ session });

  // Joint-liability cascade: one member in trouble puts the whole group at risk
  // and freezes new group lending (enforced in createGroupLoan). No automatic
  // wallet debits — redistribution is a deliberate admin action.
  const group = await LoanGroup.findById(groupLoan.group).session(session);
  if (group && group.status !== 'closed') {
    if (
      group.guaranteePolicy === 'joint' &&
      (anyOverdue || anyDefaulted) &&
      group.status !== 'at_risk'
    ) {
      group.status = 'at_risk';
      await group.save({ session });
    } else if (group.status === 'at_risk' && !anyOverdue && !anyDefaulted) {
      // Recovered: every sub-loan is current again (or the cycle is fully
      // repaid). Either way the at-risk freeze lifts so the group can borrow
      // again — otherwise a group that pays its way out stays stuck at_risk.
      group.status = 'active';
      await group.save({ session });
    }
  }

  return { groupLoan, group };
};

/**
 * Create a group loan: one individual sub-loan per member (per-member amounts)
 * under a shared set of terms, all bound to a new GroupLoan. Transactional —
 * either every sub-loan is created or none is.
 */
const createGroupLoan = async (
  req,
  { groupId, rate, duration, interestType = 'simple', startDate, allocations },
) => {
  const ownerId = req.user.effectiveOwnerId;

  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new ValidationError('At least one member allocation is required.');
  }
  const nRate = Number(rate);
  const nDuration = Number(duration);
  if (!nRate && nRate !== 0) throw new ValidationError('rate is required.');
  if (!nDuration || nDuration <= 0)
    throw new ValidationError('duration is required.');

  const session = await mongoose.startSession();
  try {
    let createdGroupLoan;
    await session.withTransaction(async () => {
      const group = await LoanGroup.findOne({
        _id: groupId,
        user: ownerId,
        ...branchScopeFor(req),
      }).session(session);
      if (!group) throw new NotFoundError('Group not found');
      if (group.status === 'at_risk') {
        throw new ValidationError(
          'This group is flagged at-risk (a member is overdue/defaulted). Resolve it before issuing a new group loan.',
        );
      }

      const memberCustomerIds = new Set(
        group.members
          .filter((m) => m.status === 'active')
          .map((m) => m.customer.toString()),
      );

      const branchFallback =
        group.branchId ||
        req.user.branchId ||
        (await getDefaultBranchId(ownerId));

      const seen = new Set();
      const allocationDocs = [];
      const groupLoanId = new mongoose.Types.ObjectId();

      for (const alloc of allocations) {
        const customerId = String(alloc.customer || alloc.customerId || '');
        const principal = Number(alloc.principal);
        if (!customerId)
          throw new ValidationError('Each allocation needs a customer.');
        if (!principal || principal <= 0)
          throw new ValidationError(
            'Each allocation needs a principal greater than zero.',
          );
        if (seen.has(customerId))
          throw new ValidationError('A member appears twice in the allocations.');
        seen.add(customerId);
        if (!memberCustomerIds.has(customerId))
          throw new ValidationError(
            'An allocation references a customer who is not an active member of this group.',
          );

        const customer = await Customer.findOne({
          _id: customerId,
          user: ownerId,
        }).session(session);
        if (!customer)
          throw new NotFoundError('A member customer was not found.');

        // Reuse the individual-loan guard: one active loan per customer.
        const existing = await Loan.findOne({
          customer: customerId,
          status: 'active',
          user: ownerId,
        }).session(session);
        if (existing)
          throw new ValidationError(
            `${customer.name} already has an active loan and cannot join this cycle.`,
          );

        const { emi, totalAmount } = computeLoanTerms(
          principal,
          nRate,
          nDuration,
          interestType,
        );

        // Grade the sub-loan exactly like an individual loan so it shows a real
        // risk grade everywhere (e.g. the dashboard "Risk distribution" chart)
        // instead of "Grade N/A". The credit score is folded in best-effort and
        // SESSION-LESS so its reads never hold this transaction's locks.
        const subHistory = await Loan.find({
          customer: customerId,
          user: ownerId,
        }).session(session);
        let subScore = null;
        try {
          subScore = await computeCreditScore(customerId);
        } catch (e) {
          subScore = null;
        }
        const riskDetails = calculateRiskScore(
          customer,
          { emi },
          subHistory,
          subScore,
        );

        const [loan] = await Loan.create(
          [
            {
              user: ownerId,
              customer: customerId,
              branchId: customer.branchId || branchFallback,
              principal,
              rate: nRate,
              duration: nDuration,
              emi,
              totalAmount,
              startDate: startDate ? new Date(startDate) : new Date(),
              remainingAmount: totalAmount,
              outstandingPrincipal: principal,
              interestType,
              status: 'pending',
              riskDetails,
              groupLoan: groupLoanId,
              loanGroup: group._id,
            },
          ],
          { session },
        );

        allocationDocs.push({
          customer: customerId,
          loan: loan._id,
          principal,
        });
      }

      const [groupLoan] = await GroupLoan.create(
        [
          {
            _id: groupLoanId,
            user: ownerId,
            branchId: branchFallback,
            group: group._id,
            allocations: allocationDocs,
            rate: nRate,
            duration: nDuration,
            interestType,
            startDate: startDate ? new Date(startDate) : new Date(),
            totalPrincipal: allocationDocs.reduce(
              (s, a) => s + a.principal,
              0,
            ),
            totalOutstanding: 0,
            status: 'pending',
          },
        ],
        { session },
      );

      if (group.status === 'forming') {
        group.status = 'active';
        await group.save({ session });
      }

      await logActivity({
        userId: req.user._id,
        action: 'group_loan_created',
        category: 'loan',
        details: `Created a group loan for "${group.name}" across ${allocationDocs.length} members`,
        metadata: {
          groupLoanId: groupLoan._id,
          groupId: group._id,
          memberCount: allocationDocs.length,
          totalPrincipal: groupLoan.totalPrincipal,
        },
        req,
      });

      createdGroupLoan = groupLoan;
    });
    return createdGroupLoan;
  } finally {
    await session.endSession();
  }
};

/**
 * Approve a pending group loan: move every sub-loan to active and disburse it
 * (same ledger shape as individual approval) inside one transaction.
 */
const approveGroupLoan = async (req, groupLoanId) => {
  const ownerId = req.user.effectiveOwnerId;
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const groupLoan = await GroupLoan.findOne({
        _id: groupLoanId,
        user: ownerId,
        ...branchScopeFor(req),
      }).session(session);
      if (!groupLoan) throw new NotFoundError('Group loan not found');
      if (groupLoan.status !== 'pending')
        throw new ValidationError('Group loan is not in pending status.');

      const loanIds = groupLoan.allocations.map((a) => a.loan).filter(Boolean);
      const loans = await Loan.find({ _id: { $in: loanIds } })
        .populate('customer')
        .session(session);

      let totalOutstanding = 0;
      for (const loan of loans) {
        if (loan.status === 'pending') {
          loan.status = 'active';
          loan.approvedBy = req.user._id;
          loan.approvedAt = new Date();
          await loan.save({ session });
          await disburseLoan(loan, req, { session });
        }
        totalOutstanding += loan.remainingAmount || 0;
      }

      groupLoan.status = 'active';
      groupLoan.totalOutstanding = roundMoney(totalOutstanding);
      await groupLoan.save({ session });

      await logActivity({
        userId: req.user._id,
        action: 'group_loan_approved',
        category: 'loan',
        details: `Approved & disbursed group loan #${short(groupLoan._id)} (${loans.length} members)`,
        metadata: { groupLoanId: groupLoan._id, memberCount: loans.length },
        req,
      });

      result = groupLoan;
    });
    return result;
  } finally {
    await session.endSession();
  }
};

// Distribute a single group payment across active sub-loans, weighted by each
// loan's outstanding balance, in integer paisa so the portions sum to EXACTLY
// roundMoney(amount) — no paisa invented or lost. The residual lands on the
// last loan (same "last absorbs remainder" rule as splitMoney/amortization).
const allocateByOutstanding = (loans, amount) => {
  const amountPaisa = Math.round(roundMoney(amount) * 100);
  const totalOutstanding = loans.reduce(
    (s, l) => s + (l.remainingAmount || 0),
    0,
  );
  let allocated = 0;
  return loans.map((l, i) => {
    let paisa;
    if (i === loans.length - 1) {
      paisa = amountPaisa - allocated;
    } else if (totalOutstanding > 0) {
      paisa = Math.round(
        amountPaisa * ((l.remainingAmount || 0) / totalOutstanding),
      );
      allocated += paisa;
    } else {
      paisa = 0;
    }
    return { loan: l, amount: paisa / 100 };
  });
};

/**
 * Apply a repayment to a group loan. Either a single `amount` (waterfalls across
 * members by outstanding share) OR explicit per-member `allocations`. Each
 * member portion runs through the existing loanRepaymentService.processRepayment
 * inside ONE transaction, so a failure on any sub-loan rolls back the whole
 * group payment (no partial collection, no orphan ledger rows).
 */
const processGroupRepayment = async (
  req,
  {
    groupLoanId,
    amount,
    allocations,
    settle = false,
    deductFromWallet = false,
    date = new Date(),
    notes = 'Group loan repayment',
    paymentMethod = 'cash',
  },
) => {
  const ownerId = req.user.effectiveOwnerId;
  const session = await mongoose.startSession();
  try {
    let summary;
    await session.withTransaction(async () => {
      const groupLoan = await GroupLoan.findOne({
        _id: groupLoanId,
        user: ownerId,
        ...branchScopeFor(req),
      }).session(session);
      if (!groupLoan) throw new NotFoundError('Group loan not found');
      if (!['active', 'overdue', 'defaulted'].includes(groupLoan.status))
        throw new ValidationError('Group loan is not collectible.');

      const loanIds = groupLoan.allocations.map((a) => a.loan).filter(Boolean);
      const subLoans = await Loan.find({ _id: { $in: loanIds } }).session(
        session,
      );
      const byId = new Map(subLoans.map((l) => [l._id.toString(), l]));
      const activeLoans = subLoans.filter((l) =>
        ['active', 'overdue'].includes(l.status),
      );

      // Build the per-member work list. A `settle` item pays off that sub-loan
      // at its early-settlement payoff (the engine recalculates interest to the
      // payment date and discounts the unaccrued portion); a normal item applies
      // a fixed amount as an installment.
      let work;
      if (Array.isArray(allocations) && allocations.length > 0) {
        work = allocations
          .map((a) => {
            const loan = byId.get(String(a.loan || a.loanId));
            if (!loan) return null;
            if (a.settle) return { loan, settle: true };
            const amt = Number(a.amount);
            return amt > 0 ? { loan, amount: amt } : null;
          })
          .filter(Boolean);
        if (work.length === 0)
          throw new ValidationError('No valid member allocations to apply.');
      } else if (settle) {
        // Settle the entire cycle: pay off every active sub-loan.
        if (activeLoans.length === 0)
          throw new ValidationError('No outstanding member loans to settle.');
        work = activeLoans.map((loan) => ({ loan, settle: true }));
      } else {
        const total = Number(amount);
        if (!total || total <= 0)
          throw new ValidationError('A positive payment amount is required.');
        if (activeLoans.length === 0)
          throw new ValidationError('No outstanding member loans to collect.');
        work = allocateByOutstanding(activeLoans, total).filter(
          (w) => w.amount > 0,
        );
      }

      // Track the requested-vs-collected only for fixed-amount (non-settle)
      // items. processRepayment caps each portion at that loan's remaining, so a
      // group amount exceeding total outstanding can't fully land — we surface
      // that as `shortfall`. A settlement discount is NOT a shortfall, so settle
      // items are excluded from this accounting.
      let intendedNonSettle = 0;
      let collectedNonSettle = 0;

      const applied = [];
      for (const item of work) {
        const { loan, settle: isSettle } = item;
        // For a settlement, push the full remaining; the engine discounts the
        // unaccrued interest and caps to the true payoff.
        const portion = isSettle ? loan.remainingAmount : item.amount;
        if (!(portion > 0)) continue;

        const { repayment } = await loanRepaymentService.processRepayment(
          loan,
          portion,
          req,
          {
            session,
            date,
            notes: isSettle ? `${notes} (Early Settlement)` : notes,
            isAutoValue: false,
            deductFromWallet,
            allowEarlySettlement: !!isSettle,
            paymentMethod,
          },
        );
        applied.push({
          loan: loan._id,
          customer: loan.customer,
          amount: repayment.amount,
          settled: !!isSettle,
        });
        if (!isSettle) {
          intendedNonSettle += item.amount;
          collectedNonSettle += repayment.amount;
        }
      }

      // Roll the sub-loan states back up to the group (and cascade at-risk).
      await recomputeGroupStatus(groupLoan._id, session);

      await logActivity({
        userId: req.user._id,
        action: 'group_repayment',
        category: 'loan',
        details: `Recorded a group repayment on #${short(groupLoan._id)} across ${applied.length} members`,
        metadata: {
          groupLoanId: groupLoan._id,
          memberCount: applied.length,
          total: applied.reduce((s, a) => s + a.amount, 0),
        },
        req,
      });

      const collected = roundMoney(applied.reduce((s, a) => s + a.amount, 0));
      summary = {
        groupLoanId: groupLoan._id,
        applied,
        requested: roundMoney(intendedNonSettle),
        collected,
        // Positive only when a fixed-amount payment exceeded what the members
        // could absorb — a settlement discount is not counted here.
        shortfall: roundMoney(Math.max(0, intendedNonSettle - collectedNonSettle)),
      };
    });
    return summary;
  } catch (err) {
    logger.error({ err, groupLoanId }, 'Group repayment failed');
    throw err;
  } finally {
    await session.endSession();
  }
};

/**
 * Quote the exact early-settlement payoff for a group loan cycle, per member and
 * in total, WITHOUT moving any money. Each member's payoff is the discounted
 * pay-today figure (interest pro-rated to now), computed with the SAME
 * loanRepaymentService.computeSettlementAmount the settle path uses — so what the
 * teller is shown is exactly what a "settle" payment collects. `discount` is the
 * saving vs. the contractual outstanding.
 */
const quoteGroupSettlement = async (req, groupLoanId, { date = new Date() } = {}) => {
  const ownerId = req.user.effectiveOwnerId;
  const groupLoan = await GroupLoan.findOne({
    _id: groupLoanId,
    user: ownerId,
    ...branchScopeFor(req),
  });
  if (!groupLoan) throw new NotFoundError('Group loan not found');

  const loanIds = groupLoan.allocations.map((a) => a.loan).filter(Boolean);
  const subLoans = await Loan.find({ _id: { $in: loanIds } }).populate(
    'customer',
    'name',
  );
  const activeLoans = subLoans.filter((l) =>
    ['active', 'overdue'].includes(l.status),
  );

  let totalOutstanding = 0;
  let totalPayoff = 0;
  const allocations = [];
  for (const loan of activeLoans) {
    const settlementTotal = await loanRepaymentService.computeSettlementAmount(
      loan,
      { date },
    );
    const outstanding = roundMoney(loan.remainingAmount || 0);
    const payoff = Math.max(
      0,
      roundMoney(settlementTotal - (loan.paidAmount || 0)),
    );
    const discount = Math.max(0, roundMoney(outstanding - payoff));
    totalOutstanding += outstanding;
    totalPayoff += payoff;
    allocations.push({
      loan: loan._id,
      customer: loan.customer?._id || loan.customer,
      customerName: loan.customer?.name || null,
      outstanding,
      payoff,
      discount,
    });
  }

  return {
    groupLoanId: groupLoan._id,
    allocations,
    totalOutstanding: roundMoney(totalOutstanding),
    totalPayoff: roundMoney(totalPayoff),
    totalDiscount: roundMoney(Math.max(0, totalOutstanding - totalPayoff)),
  };
};

/**
 * Renew a group loan (direct admin action). Mirrors individual loan renewal:
 *  - extend:   re-amortize every member's sub-loan to a new duration IN PLACE
 *              (same cycle, no new cash).
 *  - rollover: open a NEW cycle where each member's new principal = their
 *              current outstanding (carries the debt into a fresh term, no cash).
 *  - topup:    open a new cycle with a higher per-member principal; disburse only
 *              the difference above each member's outstanding.
 * All atomic — every member's sub-loan renews or none does. Top-up is frozen
 * while the group is at-risk (new exposure); rollover/extend stay available as
 * recovery tools.
 */
const renewGroupLoan = async (
  req,
  { groupLoanId, renewalType, rate, duration, interestType, startDate, allocations },
) => {
  const ownerId = req.user.effectiveOwnerId;
  if (!['rollover', 'topup', 'extend'].includes(renewalType))
    throw new ValidationError('renewalType must be rollover, topup, or extend.');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const oldGroupLoan = await GroupLoan.findOne({
        _id: groupLoanId,
        user: ownerId,
        ...branchScopeFor(req),
      }).session(session);
      if (!oldGroupLoan) throw new NotFoundError('Group loan not found');
      if (!['active', 'overdue'].includes(oldGroupLoan.status))
        throw new ValidationError(
          'Only an active or overdue group loan can be renewed.',
        );

      const group = await LoanGroup.findById(oldGroupLoan.group).session(session);
      if (!group) throw new NotFoundError('Group not found');
      if (renewalType === 'topup' && group.status === 'at_risk')
        throw new ValidationError(
          'This group is at-risk; resolve it before issuing top-up cash. Rollover or extend are still available.',
        );

      const loanIds = oldGroupLoan.allocations.map((a) => a.loan).filter(Boolean);
      const subLoans = await Loan.find({ _id: { $in: loanIds } })
        .populate('customer')
        .session(session);
      const renewable = subLoans.filter(
        (l) =>
          ['active', 'overdue'].includes(l.status) && (l.remainingAmount || 0) > 0,
      );
      if (renewable.length === 0)
        throw new ValidationError('No outstanding member sub-loans to renew.');

      const newRate =
        rate !== undefined && rate !== '' ? Number(rate) : oldGroupLoan.rate;
      const newDuration = duration ? Number(duration) : oldGroupLoan.duration;
      const newInterestType =
        interestType || oldGroupLoan.interestType || 'simple';
      const newStart = startDate ? new Date(startDate) : new Date();

      // ── EXTEND: mutate sub-loans + the cycle in place; no new cycle, no cash ──
      if (renewalType === 'extend') {
        if (!newDuration || newDuration < 1)
          throw new ValidationError('A valid new duration is required to extend.');

        let totalOutstanding = 0;
        for (const loan of renewable) {
          const { emi, totalAmount } = computeLoanTerms(
            loan.principal,
            newRate,
            newDuration,
            newInterestType,
          );
          loan.rate = newRate;
          loan.duration = newDuration;
          loan.interestType = newInterestType;
          loan.emi = emi;
          loan.totalAmount = totalAmount;
          loan.remainingAmount = Math.max(
            0,
            roundMoney(totalAmount - (loan.paidAmount || 0)),
          );
          loan.renewalType = 'extend';
          loan.renewalCount = (loan.renewalCount || 0) + 1;
          loan.lastRenewedAt = new Date();
          // Extending revives an overdue loan if it now has runway.
          if (loan.status === 'overdue')
            loan.status = loan.remainingAmount <= 0 ? 'completed' : 'active';
          await loan.save({ session });
          totalOutstanding += loan.remainingAmount;
        }

        oldGroupLoan.rate = newRate;
        oldGroupLoan.duration = newDuration;
        oldGroupLoan.interestType = newInterestType;
        oldGroupLoan.renewalType = 'extend';
        oldGroupLoan.renewalCount = (oldGroupLoan.renewalCount || 0) + 1;
        oldGroupLoan.lastRenewedAt = new Date();
        oldGroupLoan.totalOutstanding = roundMoney(totalOutstanding);
        await oldGroupLoan.save({ session });
        await recomputeGroupStatus(oldGroupLoan._id, session);

        await logActivity({
          userId: req.user._id,
          action: 'group_loan_renewed',
          category: 'loan',
          details: `Extended group loan #${short(oldGroupLoan._id)} to ${newDuration} months`,
          metadata: {
            groupLoanId: oldGroupLoan._id,
            renewalType: 'extend',
            newDuration,
          },
          req,
        });

        result = oldGroupLoan;
        return;
      }

      // ── ROLLOVER / TOP-UP: open a new cycle + settle the old sub-loans ──
      const topupByLoan = new Map();
      if (renewalType === 'topup') {
        if (!Array.isArray(allocations) || allocations.length === 0)
          throw new ValidationError(
            'Top-up needs a new principal for at least one member.',
          );
        for (const a of allocations)
          topupByLoan.set(String(a.loan || a.loanId), Number(a.principal));
      }

      const newGroupLoanId = new mongoose.Types.ObjectId();
      const branchFallback =
        oldGroupLoan.branchId ||
        group.branchId ||
        req.user.branchId ||
        (await getDefaultBranchId(ownerId));

      const allocationDocs = [];
      let totalPrincipal = 0;
      let totalOutstanding = 0;

      for (const oldLoan of renewable) {
        const oldOutstanding = oldLoan.remainingAmount || 0;
        let newPrincipal;
        if (renewalType === 'rollover') {
          newPrincipal = roundMoney(oldOutstanding);
          if (newPrincipal <= 0) continue;
        } else {
          newPrincipal = topupByLoan.get(String(oldLoan._id));
          if (!newPrincipal || newPrincipal <= oldOutstanding)
            throw new ValidationError(
              `Top-up for ${oldLoan.customer?.name || 'a member'} must exceed their outstanding (Rs. ${Math.round(oldOutstanding).toLocaleString()}).`,
            );
        }

        const { emi, totalAmount } = computeLoanTerms(
          newPrincipal,
          newRate,
          newDuration,
          newInterestType,
        );

        // Grade the renewed sub-loan so it carries a real risk grade (not N/A).
        const renewCustomerId = oldLoan.customer._id || oldLoan.customer;
        const renewHistory = await Loan.find({
          customer: renewCustomerId,
          user: ownerId,
        }).session(session);
        let renewScore = null;
        try {
          renewScore = await computeCreditScore(renewCustomerId);
        } catch (e) {
          renewScore = null;
        }
        const renewRisk = calculateRiskScore(
          oldLoan.customer && typeof oldLoan.customer === 'object'
            ? oldLoan.customer
            : { monthlyIncome: 0, trustRating: 5 },
          { emi },
          renewHistory,
          renewScore,
        );

        const [newLoan] = await Loan.create(
          [
            {
              user: ownerId,
              customer: renewCustomerId,
              branchId: oldLoan.branchId || branchFallback,
              principal: newPrincipal,
              rate: newRate,
              duration: newDuration,
              emi,
              totalAmount,
              startDate: newStart,
              remainingAmount: totalAmount,
              outstandingPrincipal: newPrincipal,
              paidAmount: 0,
              interestType: newInterestType,
              status: 'active',
              riskDetails: renewRisk,
              approvedBy: req.user._id,
              approvedAt: new Date(),
              renewedFrom: oldLoan._id,
              renewalType,
              renewalCount: (oldLoan.renewalCount || 0) + 1,
              groupLoan: newGroupLoanId,
              loanGroup: group._id,
            },
          ],
          { session },
        );

        await settleLoanRenewal(oldLoan, newLoan, renewalType, req, { session });

        allocationDocs.push({
          customer: newLoan.customer,
          loan: newLoan._id,
          principal: newPrincipal,
        });
        totalPrincipal += newPrincipal;
        totalOutstanding += totalAmount;
      }

      if (allocationDocs.length === 0)
        throw new ValidationError('Nothing to roll over — all balances are settled.');

      const [newGroupLoan] = await GroupLoan.create(
        [
          {
            _id: newGroupLoanId,
            user: ownerId,
            branchId: branchFallback,
            group: group._id,
            allocations: allocationDocs,
            rate: newRate,
            duration: newDuration,
            interestType: newInterestType,
            startDate: newStart,
            totalPrincipal: roundMoney(totalPrincipal),
            totalOutstanding: roundMoney(totalOutstanding),
            status: 'active',
            cycleNumber: (oldGroupLoan.cycleNumber || 1) + 1,
            renewedFrom: oldGroupLoan._id,
            renewalType,
            renewalCount: (oldGroupLoan.renewalCount || 0) + 1,
            lastRenewedAt: new Date(),
          },
        ],
        { session },
      );

      oldGroupLoan.status = 'renewed';
      oldGroupLoan.renewedTo = newGroupLoan._id;
      oldGroupLoan.lastRenewedAt = new Date();
      await oldGroupLoan.save({ session });

      // The new cycle's sub-loans are all current → recompute clears any prior
      // at-risk flag and re-reports the group as active.
      await recomputeGroupStatus(newGroupLoan._id, session);

      await logActivity({
        userId: req.user._id,
        action: 'group_loan_renewed',
        category: 'loan',
        details: `Renewed group loan #${short(oldGroupLoan._id)} → #${short(newGroupLoan._id)} (${renewalType}, ${allocationDocs.length} members)`,
        metadata: {
          oldGroupLoanId: oldGroupLoan._id,
          newGroupLoanId: newGroupLoan._id,
          renewalType,
          memberCount: allocationDocs.length,
        },
        req,
      });

      result = newGroupLoan;
    });
    return result;
  } finally {
    await session.endSession();
  }
};

// Notify every co-member (and the admin) that their group has been flagged
// at-risk. Best-effort — never throws into the caller (a cron).
const notifyGroupAtRisk = async (group, triggerLoan) => {
  const customerIds = (group.members || [])
    .filter((m) => m.status === 'active')
    .map((m) => m.customer);
  const customers = await Customer.find({
    _id: { $in: customerIds },
    isMember: true,
  }).select('memberId name');

  const notifications = customers
    .filter((c) => c.memberId)
    .map((c) => ({
      recipient: c.memberId,
      recipientModel: 'Member',
      title: '⚠️ Your lending group is at risk',
      message: `A member of your group "${group.name}" has missed payments. Under your joint guarantee, the group cannot take new loans until it is back in good standing.`,
      type: 'warning',
      action: 'group_at_risk',
    }));

  notifications.push({
    recipient: group.user,
    recipientModel: 'User',
    title: '⚠️ Group flagged at-risk',
    message: `Group "${group.name}" was flagged at-risk after sub-loan #${short(triggerLoan._id)} fell behind. New group lending is frozen for this group.`,
    type: 'warning',
    action: 'group_at_risk',
  });

  if (notifications.length > 0) await Notification.insertMany(notifications);
};

/**
 * Cron hook: after a sub-loan is downgraded to overdue/defaulted, roll the
 * change up to its group and — on the transition into `at_risk` — notify the
 * co-members and admin. Best-effort and self-contained so a notification
 * failure never breaks the cron.
 */
const cascadeGroupRisk = async (loan) => {
  if (!loan?.groupLoan) return;
  try {
    const gl = await GroupLoan.findById(loan.groupLoan).select('group');
    if (!gl) return;
    const before = await LoanGroup.findById(gl.group).select('status');
    const wasAtRisk = before?.status === 'at_risk';

    const result = await recomputeGroupStatus(loan.groupLoan);
    const group = result?.group;

    if (group && group.status === 'at_risk' && !wasAtRisk) {
      await notifyGroupAtRisk(group, loan);
    }
  } catch (err) {
    logger.error({ err, loanId: loan?._id }, 'Group risk cascade failed');
  }
};

module.exports = {
  createGroupLoan,
  approveGroupLoan,
  processGroupRepayment,
  quoteGroupSettlement,
  renewGroupLoan,
  recomputeGroupStatus,
  cascadeGroupRisk,
  NotFoundError,
  ValidationError,
};
