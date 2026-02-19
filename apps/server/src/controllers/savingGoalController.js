const SavingGoal = require('../models/SavingGoal');
const Member = require('../models/Member');
const { logActivity } = require('./activityLogController');

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

    // Check if member has enough balance
    const member = await Member.findById(req.member._id);
    if (member.currentBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Since we decided on Virtual Allocation for now, we don't actually deduct from currentBalance
    // But we update the currentAmount of the goal.
    // However, if we want to "WOW" the user, we should track it as "Allocated" funds.

    goal.currentAmount += Math.round(Number(amount));

    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    }

    await goal.save();

    // Log activity for the ledger
    await logActivity({
      userId: req.member._id,
      action: 'goal_contribution',
      category: 'member',
      details: `Allocated ${amount} to goal: ${goal.title}`,
      metadata: {
        goalId: goal._id,
        amount,
        title: goal.title,
        isMemberAction: true,
      },
      req,
    });

    res.json({
      success: true,
      goal,
      message: `Successfully contributed ${amount} to your goal!`,
    });
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
