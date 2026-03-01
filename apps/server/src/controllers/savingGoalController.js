const SavingGoal = require('../models/SavingGoal');
const Member = require('../models/Member');
const mongoose = require('mongoose');
const { logActivity } = require('./activityLogController');
const {
  createTransactionNotification,
  notifyAdminsOfMemberAction,
} = require('../utils/notificationHelper');

// @desc    Get all saving goals for a member
// @route   GET /api/saving-goals
// @access  Private (Member)
const getMyGoals = async (req, res) => {
  try {
    const goals = await SavingGoal.find({ member: req.member._id }).sort(
      '-createdAt',
    );
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new saving goal
// @route   POST /api/saving-goals
// @access  Private (Member)
const createGoal = async (req, res) => {
  const { title, targetAmount, category, deadline } = req.body;

  try {
    const goal = await SavingGoal.create({
      user: req.member.user, // The owner/admin
      member: req.member._id,
      title,
      targetAmount,
      category,
      deadline,
    });

    // Log activity
    await logActivity({
      userId: req.member._id,
      action: 'goal_created',
      category: 'member',
      details: `Created new saving goal: ${goal.title}`,
      metadata: { goalId: goal._id },
      req,
    });

    res.status(201).json(goal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a saving goal
// @route   PUT /api/saving-goals/:id
// @access  Private (Member)
const updateGoal = async (req, res) => {
  try {
    const goal = await SavingGoal.findOne({
      _id: req.params.id,
      member: req.member._id,
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const { title, targetAmount, category, deadline, status } = req.body;

    goal.title = title || goal.title;
    goal.targetAmount = targetAmount || goal.targetAmount;
    goal.category = category || goal.category;
    goal.deadline = deadline || goal.deadline;
    goal.status = status || goal.status;

    const updatedGoal = await goal.save();
    // Log activity
    await logActivity({
      userId: req.member._id,
      action: 'goal_updated',
      category: 'member',
      details: `Updated saving goal: ${updatedGoal.title}`,
      metadata: { goalId: updatedGoal._id },
      req,
    });

    res.json(updatedGoal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a saving goal
// @route   DELETE /api/saving-goals/:id
// @access  Private (Member)
const deleteGoal = async (req, res) => {
  try {
    const goal = await SavingGoal.findOneAndDelete({
      _id: req.params.id,
      member: req.member._id,
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // Log activity
    await logActivity({
      userId: req.member._id,
      action: 'goal_deleted',
      category: 'member',
      details: `Deleted saving goal: ${goal.title}`,
      metadata: { goalId: req.params.id },
      req,
    });

    res.json({ message: 'Goal removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Contribute to a saving goal
// @route   POST /api/saving-goals/:id/contribute
// @access  Private (Member)
const contributeToGoal = async (req, res) => {
  const { amount } = req.body;

  try {
    const goal = await SavingGoal.findOne({
      _id: req.params.id,
      member: req.member._id,
    });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const contributionAmount = Math.round(Number(amount));
    if (!contributionAmount || contributionAmount <= 0) {
      return res.status(400).json({ message: 'Invalid contribution amount' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Deduct from member balance atomically
      const updatedMember = await Member.findOneAndUpdate(
        { _id: req.member._id, currentBalance: { $gte: contributionAmount } },
        {
          $inc: {
            currentBalance: -contributionAmount,
            totalWithdrawn: contributionAmount,
          },
        },
        { session, new: true },
      );

      if (!updatedMember) {
        throw new Error('Insufficient balance or member not found');
      }

      // 2. Update goal amount atomically
      const updatedGoal = await SavingGoal.findOneAndUpdate(
        { _id: req.params.id, member: req.member._id },
        { $inc: { currentAmount: contributionAmount } },
        { session, new: true },
      );

      if (!updatedGoal) {
        throw new Error('Goal not found');
      }

      // 3. Mark as completed if target met
      if (
        updatedGoal.currentAmount >= updatedGoal.targetAmount &&
        updatedGoal.status !== 'completed'
      ) {
        updatedGoal.status = 'completed';
        await updatedGoal.save({ session });
      }

      // 4. Record withdrawal in Investment ledger
      const Investment = require('../models/Investment');
      await Investment.create(
        [
          {
            user: req.member.user,
            member: req.member._id,
            branchId: updatedMember.branchId,
            type: 'withdrawal',
            amount: contributionAmount,
            balanceAfter: updatedMember.currentBalance,
            description: `Goal contribution: ${updatedGoal.title}`,
            date: new Date(),
          },
        ],
        { session },
      );

      await session.commitTransaction();

      // Log activity (outside transaction)
      await logActivity({
        userId: req.member._id,
        action: 'goal_contribution',
        category: 'member',
        details: `Contributed ${contributionAmount} to goal: ${updatedGoal.title}`,
        metadata: {
          goalId: updatedGoal._id,
          amount: contributionAmount,
          title: updatedGoal.title,
          isMemberAction: true,
        },
        req,
      });

      // ── Notifications ──────────────────────────────────────────────────────
      try {
        await createTransactionNotification({
          recipientId: req.member._id,
          title: 'Goal Contribution',
          message: `You contributed Rs. ${contributionAmount.toLocaleString()} to your goal: ${updatedGoal.title}.`,
          type: 'info',
          branchId: updatedMember.branchId,
          action: 'goal_contribution_notification',
          metadata: {
            goalId: updatedGoal._id,
            amount: contributionAmount,
            link: '/member/dashboard',
          },
        });

        if (updatedGoal.status === 'completed') {
          await createTransactionNotification({
            recipientId: req.member._id,
            title: 'Goal Achieved!',
            message: `Congratulations! You've successfully reached your target for "${updatedGoal.title}".`,
            type: 'success',
            branchId: updatedMember.branchId,
            action: 'goal_completed_notification',
            metadata: { goalId: updatedGoal._id, link: '/member/dashboard' },
          });
        }

        // Notify Admins
        await notifyAdminsOfMemberAction({
          title: 'Saving Goal Contribution',
          message: `${updatedMember.name} contributed Rs. ${contributionAmount.toLocaleString()} to goal: ${updatedGoal.title}.`,
          type: 'success',
          branchId: updatedMember.branchId,
          ownerId: req.member.user,
          metadata: {
            memberId: updatedMember._id,
            goalId: updatedGoal._id,
            amount: contributionAmount,
            link: `/admin/members/${updatedMember._id}`,
          },
        });
      } catch (notifError) {
        console.error('Goal Notification Error:', notifError);
      }

      res.json({
        success: true,
        goal: updatedGoal,
        member: { currentBalance: updatedMember.currentBalance },
        message: `Successfully contributed ${contributionAmount} to your goal!`,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
};
