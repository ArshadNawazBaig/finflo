const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Member = require('../../models/Member');
const Investment = require('../../models/Investment');
const BusinessShare = require('../../models/BusinessShare');
const ProfitDistribution = require('../../models/ProfitDistribution');
const FinancialTransaction = require('../../models/FinancialTransaction');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const Repayment = require('../../models/Repayment');
const ActivityLog = require('../../models/ActivityLog');
const loanRepaymentService = require('../../services/loanRepaymentService');
const Loan = require('../../models/Loan');
const Checkbook = require('../../models/Checkbook');
const { canAddMember } = require('../../utils/planLimits');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../../utils/notificationHelper');
const { logActivity } = require('../activityLogController');
const {
  deleteCloudinaryFileByUrl,
  uploadSignature,
} = require('../../utils/cloudinaryHelper');
const { sendEmail, sendEmailAsync } = require('../../utils/email');
const raastService = require('../../services/raastService');
const {
  transactionEmail,
  memberApprovalEmail,
} = require('../../utils/emailTemplates');
const { calculateEffectiveBalance } = require('../../utils/balanceUtils');
const Branch = require('../../models/Branch');
const { updateMemberCreditLimit } = require('../../services/creditLimitService');
const { getEmailBranding } = require('../../utils/brandingUtils');
const { escapeRegExp } = require('../../utils/stringUtils');
const { roundMoney } = require('../../utils/money');
const { parseBoolean } = require('../../utils/parseQuery');

const { calculateWeightedAverageBalance } = require('./profitHelpers');

// Get member's investment history
const getMemberInvestments = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { startDate, endDate } = req.query;
    const query = {
      member: id,
      user: userId,
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [investments, total] = await Promise.all([
      Investment.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Investment.countDocuments(query),
    ]);

    res.json({
      investments,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Get Investments Error:', error);
    res.status(500).json({ message: 'Failed to fetch investments' });
  }
};

// Add investment (deposit)
const addInvestment = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const {
      amount,
      description,
      notes: userNotes,
      applyDeduction = true,
      repaymentType = 'settlement',
      accountType = 'current', // 'current' or 'saving'
      paymentMethod = 'cash', // 'cash' or 'online'
    } = req.body;

    const isSaving = accountType === 'saving';
    const systemDescription = isSaving ? 'Saving account deposit' : 'Investment deposit';

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid investment amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const balanceBefore = isSaving ? member.savingBalance : member.currentBalance;
    const investedBefore = isSaving ? member.totalSavingDeposited : member.totalInvested;

    // Update member balances atomically
    const incFields = isSaving
      ? { totalSavingDeposited: amount, savingBalance: amount }
      : { totalInvested: amount, currentBalance: amount };

    // Wrap the balance mutation + both ledger writes in one transaction so a crash
    // can never leave the member balance changed without a matching Investment /
    // FinancialTransaction (ledger drift). Previously these were three unguarded
    // sequential writes.
    const depositSession = await mongoose.startSession();
    let updatedMember;
    let investment;
    let balanceAfter;
    try {
      depositSession.startTransaction();

      updatedMember = await Member.findOneAndUpdate(
        { _id: id, user: userId },
        { $inc: incFields },
        { new: true, session: depositSession },
      );

      if (!updatedMember) {
        throw new Error('Member not found');
      }

      balanceAfter = isSaving
        ? updatedMember.savingBalance
        : updatedMember.currentBalance;

      const [createdInvestment] = await Investment.create(
        [
          {
            user: userId,
            member: id,
            branchId: member.branchId,
            type: 'deposit',
            amount,
            accountType,
            description: description || systemDescription,
            balanceAfter,
          },
        ],
        { session: depositSession },
      );
      investment = createdInvestment;

      const financialTx = new FinancialTransaction({
        user: userId,
        branchId: member.branchId,
        type: 'credit',
        category: isSaving ? 'saving_deposit' : 'investment',
        amount,
        date: new Date(),
        description: description || systemDescription,
        notes: userNotes || undefined,
        paymentMethod,
        member: member._id,
        referenceId: investment._id,
        referenceModel: 'Investment',
      });
      await financialTx.save({ session: depositSession });

      await depositSession.commitTransaction();
    } catch (depositErr) {
      await depositSession.abortTransaction();
      depositSession.endSession();
      return res
        .status(depositErr.message === 'Member not found' ? 404 : 500)
        .json({ message: depositErr.message || 'Failed to add deposit' });
    }
    depositSession.endSession();

    // Log activity with before/after state
    await logActivity({
      userId: req.user._id,
      action: isSaving ? 'member_saving_deposit' : 'member_investment_added',
      category: 'member',
      details: `Added ${isSaving ? 'saving' : 'investment'} deposit of ${amount} for member: ${member.name}`,
      metadata: {
        memberId: id,
        amount,
        accountType,
        investmentId: investment._id,
        before: { balance: balanceBefore, totalDeposited: investedBefore },
        after: { balance: balanceAfter, totalDeposited: isSaving ? updatedMember.totalSavingDeposited : updatedMember.totalInvested },
      },
      req,
    });

    // ── Notifications ──────────────────────────────────────────────────────
    try {
      const accountLabel = isSaving ? 'Saving Account' : 'Current Account';
      await createTransactionNotification({
        recipientId: member._id,
        title: `${accountLabel} Deposit`,
        message: `Your ${accountLabel.toLowerCase()} has been credited with Rs. ${amount.toLocaleString()} (${description || 'Manual Deposit'}).`,
        type: 'success',
        branchId: member.branchId,
        action: 'member_deposit_notification',
        metadata: {
          amount,
          accountType,
          investmentId: investment._id,
          link: '/member/investments',
        },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: `${accountLabel} Deposit Confirmation`,
          html: transactionEmail({
            memberName: member.name,
            transactionType: `${accountLabel} Deposit`,
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: balanceAfter.toLocaleString(),
            branchName: branchName,
            reference: investment._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error('Deposit Notification Error:', notifError);
    }

    // ── Automatic Loan Deduction (only for current account) ────────────────
    if (!isSaving) {
      try {
        // Tenant scope (`user: userId`) is defensive — `customer` is already
        // tied to this business via the member fetch above, but keying the
        // lookup on user too closes any cross-tenant edge case.
        // Deterministic order (oldest first) so multiple active loans behave
        // predictably and the oldest debt gets paid first.
        const activeLoan = await Loan.findOne({
          customer: member.customer,
          user: userId,
          status: 'active',
        }).sort({ createdAt: 1 });

        if (activeLoan && applyDeduction) {
          let deductionAmount = Math.min(amount, activeLoan.remainingAmount);

          // If monthly installment, cap deduction at 1 EMI
          if (repaymentType === 'installment') {
            deductionAmount = Math.min(deductionAmount, activeLoan.emi);
          }

          if (deductionAmount > 0) {
            await loanRepaymentService.processRepayment(
              activeLoan,
              deductionAmount,
              req,
              {
                notes: `Auto-deduction from deposit: ${description || 'Manual Deposit'}`,
                isAutoValue: true,
                allowEarlySettlement: repaymentType === 'settlement',
              },
            );
            // Refetch member to get updated balance for the response
            const updatedMember = await Member.findById(member._id);
            return res.status(201).json({
              investment,
              member: updatedMember,
              autoRepayment: {
                applied: true,
                amount: deductionAmount,
                loanId: activeLoan._id,
              },
            });
          }
        }
      } catch (autoRepoError) {
        console.error('Auto Repayment Error in addInvestment:', autoRepoError);
        // Non-fatal, return the deposit success
      }

      // Update member's credit limit
      await updateMemberCreditLimit(id);
    }

    res.status(201).json({ investment, member: updatedMember });
  } catch (error) {
    console.error('Add Investment Error:', error);
    res.status(500).json({ message: 'Failed to add investment' });
  }
};


// Withdraw investment
const withdrawInvestment = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;
    const { amount, description, notes: userNotes, accountType = 'current', paymentMethod = 'cash', checkbookId, checkNo, bearer } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // ── Checkbook validation ──────────────────────────────────────────────
    let checkbookDoc = null;
    if (checkbookId) {
      checkbookDoc = await Checkbook.findOne({
        _id: checkbookId,
        member: id,
        user: userId,
        status: 'active',
      });
      if (!checkbookDoc) {
        return res.status(400).json({ message: 'Invalid or inactive checkbook' });
      }
      if (checkbookDoc.usedLeaves >= checkbookDoc.numberOfLeaves) {
        return res.status(400).json({ message: 'All checkbook leaves have been used. Please issue a new checkbook.' });
      }
    }

    // ── Check Bearer KYC ──────────────────────────────────────────────────
    // When the check is being cashed by someone other than the account holder
    // (bearer.type === 'other') we require their name + CNIC so the audit
    // trail can identify who physically received the funds.
    let bearerInfo = null;
    if (checkbookDoc && bearer && typeof bearer === 'object') {
      if (bearer.type === 'other') {
        const name = (bearer.name || '').trim();
        const cnic = (bearer.cnic || '').trim();
        if (!name || !cnic) {
          return res.status(400).json({
            message:
              'When a check is cashed by someone other than the account holder, both name and CNIC are required for the bearer.',
          });
        }
        bearerInfo = {
          type: 'other',
          name,
          cnic,
          phone: (bearer.phone || '').trim() || undefined,
        };
      } else {
        bearerInfo = { type: 'self' };
      }
    }

    const isSaving = accountType === 'saving';
    const systemDescription = isSaving ? 'Saving account withdrawal' : 'Investment withdrawal';
    const checkbookLabel = checkbookDoc
      ? ` (Checkbook: ${checkbookDoc.checkbookNumber}${checkNo ? ', Check #' + checkNo : ''}${
          bearerInfo?.type === 'other'
            ? `, Bearer: ${bearerInfo.name} — CNIC ${bearerInfo.cnic}`
            : ''
        })`
      : '';
    const availableBalance = isSaving ? member.savingBalance : member.currentBalance;

    if (availableBalance < amount) {
      return res
        .status(400)
        .json({ message: `Insufficient ${isSaving ? 'saving' : 'current'} account balance for withdrawal` });
    }

    const balanceBefore = availableBalance;
    const withdrawnBefore = isSaving ? member.totalSavingWithdrawn : member.totalWithdrawn;

    // Update member balances atomically — the `$gte` predicate closes the
    // TOCTOU window: if two parallel requests both pass the read above, only
    // the first one whose decrement keeps balance non-negative succeeds.
    const incFields = isSaving
      ? { savingBalance: -amount, totalSavingWithdrawn: amount }
      : { currentBalance: -amount, totalWithdrawn: amount };

    const balanceField = isSaving ? 'savingBalance' : 'currentBalance';

    // Wrap the balance decrement + ledger writes + checkbook leaf increment in one
    // transaction so a crash can never leave the balance reduced without a matching
    // withdrawal record (or a consumed check leaf without a debit). The `$gte`
    // predicate still closes the concurrent-overdraft TOCTOU window.
    const withdrawSession = await mongoose.startSession();
    let updatedMember;
    let investment;
    let balanceAfter;
    try {
      withdrawSession.startTransaction();

      updatedMember = await Member.findOneAndUpdate(
        { _id: id, user: userId, [balanceField]: { $gte: amount } },
        { $inc: incFields },
        { new: true, session: withdrawSession },
      );

      if (!updatedMember) {
        // Either the member is gone or another concurrent request consumed the
        // funds — surface as insufficient balance to the caller.
        throw new Error('INSUFFICIENT_BALANCE');
      }

      balanceAfter = isSaving
        ? updatedMember.savingBalance
        : updatedMember.currentBalance;

      const [createdInvestment] = await Investment.create(
        [
          {
            user: userId,
            member: id,
            branchId: member.branchId,
            type: 'withdrawal',
            amount,
            accountType,
            description: (description || systemDescription) + checkbookLabel,
            balanceAfter,
            metadata: checkbookDoc
              ? {
                  checkbookId: checkbookDoc._id,
                  checkbookNumber: checkbookDoc.checkbookNumber,
                  checkNo: checkNo || undefined,
                  ...(bearerInfo ? { bearer: bearerInfo } : {}),
                }
              : {},
          },
        ],
        { session: withdrawSession },
      );
      investment = createdInvestment;

      // ── Increment checkbook used leaves ───────────────────────────────────
      if (checkbookDoc) {
        checkbookDoc.usedLeaves += 1;
        if (checkbookDoc.usedLeaves >= checkbookDoc.numberOfLeaves) {
          checkbookDoc.status = 'used';
        }
        await checkbookDoc.save({ session: withdrawSession });
      }

      // Create Financial Transaction
      const financialTx = new FinancialTransaction({
        user: userId,
        branchId: member.branchId,
        type: 'debit',
        category: isSaving ? 'saving_withdrawal' : 'withdrawal',
        amount,
        date: new Date(),
        description: (description || systemDescription) + checkbookLabel,
        notes: userNotes || undefined,
        paymentMethod,
        member: member._id,
        referenceId: investment._id,
        referenceModel: 'Investment',
        checkbookId: checkbookDoc?._id || undefined,
      });
      await financialTx.save({ session: withdrawSession });

      await withdrawSession.commitTransaction();
    } catch (withdrawErr) {
      await withdrawSession.abortTransaction();
      withdrawSession.endSession();
      if (withdrawErr.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({
          message: `Insufficient ${isSaving ? 'saving' : 'current'} account balance for withdrawal`,
        });
      }
      return res
        .status(500)
        .json({ message: withdrawErr.message || 'Failed to process withdrawal' });
    }
    withdrawSession.endSession();

    // Log activity with before/after state
    await logActivity({
      userId: req.user._id,
      action: isSaving ? 'member_saving_withdrawal' : 'member_withdrawal_added',
      category: 'member',
      details: `Processed ${isSaving ? 'saving' : ''} withdrawal of ${amount} for member: ${member.name}`,
      metadata: {
        memberId: id,
        amount,
        accountType,
        investmentId: investment._id,
        before: { balance: balanceBefore, totalWithdrawn: withdrawnBefore },
        after: { balance: balanceAfter, totalWithdrawn: isSaving ? updatedMember.totalSavingWithdrawn : updatedMember.totalWithdrawn },
        ...(bearerInfo ? { bearer: bearerInfo } : {}),
      },
      req,
    });

    // Update member's credit limit (only for current account)
    if (!isSaving) {
      await updateMemberCreditLimit(id);
    }

    // ── Notifications ──────────────────────────────────────────────────────
    try {
      const accountLabel = isSaving ? 'Saving Account' : 'Current Account';
      await createTransactionNotification({
        recipientId: member._id,
        title: `${accountLabel} Withdrawal`,
        message: `A withdrawal of Rs. ${amount.toLocaleString()} has been processed from your ${accountLabel.toLowerCase()} (${description || 'Manual Withdrawal'}).`,
        type: 'info',
        branchId: member.branchId,
        action: 'member_withdrawal_notification',
        metadata: {
          amount,
          accountType,
          investmentId: investment._id,
          link: '/member/investments',
        },
      });

      // Email Notification
      if (member.email) {
        const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);

        sendEmailAsync({
          to: member.email,
          subject: `${accountLabel} Withdrawal Confirmation`,
          html: transactionEmail({
            memberName: member.name,
            transactionType: `${accountLabel} Withdrawal`,
            amount: amount.toLocaleString(),
            date: new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            balance: balanceAfter.toLocaleString(),
            branchName: branchName,
            reference: investment._id.toString().slice(-8).toUpperCase(),
            logoUrl: logoUrl,
          }),
        });
      }
    } catch (notifError) {
      console.error('Withdrawal Notification Error:', notifError);
    }

    res.status(201).json({ investment, member: updatedMember });
  } catch (error) {
    console.error('Withdraw Investment Error:', error);
    res.status(500).json({ message: 'Failed to withdraw investment' });
  }
};

// Get member's profit history
const getMemberProfits = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const { id } = req.params;

    const member = await Member.findOne({ _id: id, user: userId });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const profits = await ProfitDistribution.find({
      member: id,
      user: userId,
    }).sort({ date: -1 });

    res.json(profits);
  } catch (error) {
    console.error('Get Profits Error:', error);
    res.status(500).json({ message: 'Failed to fetch profits' });
  }
};

// Distribute profit to all members
const distributeProfit = async (req, res) => {
  try {
    const userId = req.user.effectiveOwnerId;
    const {
      totalProfit,
      period,
      description,
      useCustomRates,
      startDate,
      endDate,
    } = req.body;

    if (!totalProfit || totalProfit <= 0) {
      return res.status(400).json({ message: 'Invalid profit amount' });
    }

    // Default dates to current month if not provided
    const now = new Date();
    const periodStart = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all active members
    const members = await Member.find({ user: userId, status: 'Active' });
    if (members.length === 0) {
      return res.status(400).json({ message: 'No active members found' });
    }

    const distributions = [];

    // Option 1: Use custom profit rates (if specified)
    if (useCustomRates) {
      for (const member of members) {
        // Use Weighted Average Balance for calculation
        const weightedBalance = await calculateWeightedAverageBalance(
          member._id,
          periodStart,
          periodEnd,
          'regular',
        );

        if (weightedBalance > 0 && member.profitRate > 0) {
          const profitAmount = Math.round(
            (weightedBalance * member.profitRate) / 100,
          );

          if (profitAmount <= 0) continue;

          // Credit the member's wallet, book the distribution record AND its
          // ledger row as ONE atomic unit. These are three documents; without a
          // transaction a crash between them leaves a member credited with no
          // distribution/ledger row (or a distribution with no credit) — the
          // missing-income / orphan-row drift the backfill scripts exist to repair.
          let distribution;
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              // Update member profit atomically
              await Member.findByIdAndUpdate(
                member._id,
                {
                  $inc: { totalProfit: profitAmount, currentBalance: profitAmount },
                },
                { session },
              );

              // Create profit distribution record
              [distribution] = await ProfitDistribution.create(
                [
                  {
                    user: userId,
                    member: member._id,
                    branchId: member.branchId,
                    amount: profitAmount,
                    type: 'regular',
                    period:
                      period ||
                      periodStart.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      }),
                    calculationMethod: `Weighted Avg Balance (Rs. ${roundMoney(weightedBalance).toLocaleString()}) × ${member.profitRate}% Rate`,
                    investmentShare: member.profitRate,
                  },
                ],
                { session },
              );

              // Create Financial Transaction
              await FinancialTransaction.create(
                [
                  {
                    user: userId,
                    branchId: member.branchId,
                    type: 'expense',
                    category: 'profit_distribution',
                    amount: profitAmount,
                    date: new Date(),
                    description: `Profit distribution for ${period || 'current period'} (Weighted Avg)`,
                    member: member._id,
                    referenceId: distribution._id,
                    referenceModel: 'ProfitDistribution',
                    paymentMethod: 'online',
                  },
                ],
                { session },
              );
            });
          } finally {
            await session.endSession();
          }

          // Notify member
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: 'Profit Credited',
              message: `Profit of Rs. ${profitAmount.toLocaleString()} has been added. Calculated on Weighted Avg Balance of Rs. ${Math.round(weightedBalance).toLocaleString()} at ${member.profitRate}% rate.`,
              type: 'success',
              branchId: member.branchId,
              action: 'member_profit_notification',
              metadata: {
                amount: profitAmount,
                distributionId: distribution._id,
                link: '/member/investments',
              },
            });

            // Send Email Notification (non-blocking)
            const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);
            sendEmailAsync({
              to: member.email,
              subject: `Profit Credited - ${branchName}`,
              html: transactionEmail({
                memberName: member.name,
                transactionType: 'Profit Distribution',
                amount: profitAmount.toLocaleString(),
                date: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
                balance: (
                  await calculateEffectiveBalance(member._id)
                ).toLocaleString(),
                reference: distribution._id.toString().slice(-8).toUpperCase(),
                branchName: branchName,
                logoUrl: logoUrl,
              }),
            });
          } catch (notifError) {
            console.error('Profit Notification Error:', notifError);
          }

          distributions.push(distribution);
        }
      }
    } else {
      // Option 2: Proportional distribution based on Weighted Average Investment share
      const memberBalances = await Promise.all(
        members.map(async (m) => ({
          member: m,
          weightedBalance: await calculateWeightedAverageBalance(
            m._id,
            periodStart,
            periodEnd,
            'regular',
          ),
        })),
      );

      const totalWeightedPool = memberBalances.reduce(
        (sum, item) => sum + item.weightedBalance,
        0,
      );

      if (totalWeightedPool === 0) {
        return res
          .status(400)
          .json({ message: 'No weighted average balance found in period' });
      }

      // Largest-remainder allocation: the sum of credited amounts must equal the
      // declared pool EXACTLY. Rounding each member's share independently lost or
      // created rupees (e.g. 100 split 3 ways → 33+33+33 = 99) and silently broke
      // the "sum of payouts == pool" invariant. Floor everyone, then hand the
      // leftover rupees to the largest fractional remainders, one each.
      const profitAllocations = (() => {
        const eligible = memberBalances.filter((i) => i.weightedBalance > 0);
        const rows = eligible.map((i) => {
          const exact = (i.weightedBalance / totalWeightedPool) * totalProfit;
          const floorAmt = Math.floor(exact);
          return { id: String(i.member._id), amount: floorAmt, frac: exact - floorAmt };
        });
        let leftover = Math.round(
          totalProfit - rows.reduce((s, r) => s + r.amount, 0),
        );
        rows
          .slice()
          .sort((a, b) => b.frac - a.frac)
          .forEach((r) => {
            if (leftover > 0) {
              r.amount += 1;
              leftover -= 1;
            }
          });
        return new Map(rows.map((r) => [r.id, r.amount]));
      })();

      for (const item of memberBalances) {
        const { member, weightedBalance } = item;
        if (weightedBalance > 0) {
          const share = (weightedBalance / totalWeightedPool) * 100;
          const profitAmount = profitAllocations.get(String(member._id)) || 0;

          if (profitAmount <= 0) continue;

          // Credit the member's wallet, book the distribution record AND its
          // ledger row as ONE atomic unit (see the custom-rate branch above for
          // why) so a mid-loop crash can't half-apply a member's profit.
          let distribution;
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              // Update member profit atomically
              await Member.findByIdAndUpdate(
                member._id,
                {
                  $inc: { totalProfit: profitAmount, currentBalance: profitAmount },
                },
                { session },
              );

              // Create profit distribution record
              [distribution] = await ProfitDistribution.create(
                [
                  {
                    user: userId,
                    member: member._id,
                    branchId: member.branchId,
                    amount: profitAmount,
                    type: 'regular',
                    period:
                      period ||
                      periodStart.toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      }),
                    calculationMethod:
                      description ||
                      `Weighted Avg Balance: Rs. ${roundMoney(weightedBalance).toLocaleString()} (${share.toFixed(2)}% share of pool)`,
                    investmentShare: share,
                  },
                ],
                { session },
              );

              // Create Financial Transaction
              await FinancialTransaction.create(
                [
                  {
                    user: userId,
                    branchId: member.branchId,
                    type: 'expense',
                    category: 'profit_distribution',
                    amount: profitAmount,
                    date: new Date(),
                    description: `Profit distribution for ${period || 'current period'} (Weighted Avg)`,
                    member: member._id,
                    referenceId: distribution._id,
                    referenceModel: 'ProfitDistribution',
                    paymentMethod: 'online',
                  },
                ],
                { session },
              );
            });
          } finally {
            await session.endSession();
          }

          // Notify member
          try {
            await createTransactionNotification({
              recipientId: member._id,
              title: 'Profit Credited',
              message: `Profit of Rs. ${profitAmount.toLocaleString()} has been added (Share: ${share.toFixed(2)}%). Calculated on Weighted Avg Balance of Rs. ${Math.round(weightedBalance).toLocaleString()}.`,
              type: 'success',
              branchId: member.branchId,
              action: 'member_profit_notification',
              metadata: {
                amount: profitAmount,
                distributionId: distribution._id,
                link: '/member/investments',
              },
            });

            // Send Email Notification (non-blocking)
            const { brandName: branchName, logoUrl } = await getEmailBranding(req.user, member.branchId);
            sendEmailAsync({
              to: member.email,
              subject: `Profit Credited - ${branchName}`,
              html: transactionEmail({
                memberName: member.name,
                transactionType: 'Profit Distribution',
                amount: profitAmount.toLocaleString(),
                date: new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
                balance: (
                  await calculateEffectiveBalance(member._id)
                ).toLocaleString(),
                reference: distribution._id.toString().slice(-8).toUpperCase(),
                branchName: branchName,
                logoUrl: logoUrl,
              }),
            });
          } catch (notifError) {
            console.error('Profit Notification Error:', notifError);
          }

          distributions.push(distribution);
        }
      }
    }

    // Log activity
    await logActivity({
      userId: req.user._id,
      action: 'profit_distributed',
      category: 'member',
      details: `Distributed total profit of ${totalProfit} to ${distributions.length} members for period: ${period}`,
      metadata: {
        totalProfit,
        period,
        membersCount: distributions.length,
      },
      req,
    });

    res.status(201).json({
      message: 'Profit distributed successfully',
      distributions,
      totalDistributed: Math.round(
        distributions.reduce((sum, d) => sum + d.amount, 0),
      ),
      membersCount: distributions.length,
    });
  } catch (error) {
    console.error('Distribute Profit Error:', error);
    res.status(500).json({ message: 'Failed to distribute profit' });
  }
};

module.exports = {
  getMemberInvestments,
  addInvestment,
  withdrawInvestment,
  getMemberProfits,
  distributeProfit,
};
