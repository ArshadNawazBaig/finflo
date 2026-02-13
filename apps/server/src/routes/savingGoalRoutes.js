const express = require('express');
const router = express.Router();
const {
  getMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
} = require('../controllers/savingGoalController');
const { protectMember } = require('../middleware/memberAuthMiddleware');
const {
  savingGoalValidation,
  savingGoalContributionValidation,
} = require('../middleware/validationMiddleware');

// All routes require member authentication
router.use(protectMember);

router.route('/').get(getMyGoals).post(savingGoalValidation, createGoal);

router.route('/:id').put(savingGoalValidation, updateGoal).delete(deleteGoal);

router
  .route('/:id/contribute')
  .post(savingGoalContributionValidation, contributeToGoal);

module.exports = router;
