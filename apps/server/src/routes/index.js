const express = require('express');
const router = express.Router();

const routes = [
  ['/auth', './authRoutes'],
  ['/member-auth', './memberAuthRoutes'],
  ['/customers', './customerRoutes'],
  ['/loans', './loanRoutes'],
  ['/staff', './staffRoutes'],
  ['/repayments', './repaymentRoutes'],
  ['/ledger', './ledgerRoutes'],
  ['/members', './memberRoutes'],
  ['/subscription', './subscriptionRoutes'],
  ['/dashboard', './dashboardRoutes'],
  ['/reports', './reportRoutes'],
  ['/branches', './branchRoutes'],
  ['/contact', './contactRoutes'],
  ['/super-admin', './superAdminRoutes'],
  ['/notifications', './notificationRoutes'],
  ['/member-notifications', './memberNotificationRoutes'],
  ['/activity-logs', './activityLogRoutes'],
  ['/system-settings', './systemSettingsRoutes'],
  ['/revenue', './revenueRoutes'],
  ['/backup', './backupRoutes'],
  ['/tickets', './supportTicketRoutes'],
  ['/public', './publicRoutes'],
  ['/communication', './communicationRoutes'],
  ['/saving-goals', './savingGoalRoutes'],
  ['/search', './searchRoutes'],
  ['/external-transfers', './externalTransferRoutes'],
  ['/loan-products', './loanProductRoutes'],
  ['/roles', './roleRoutes'],
  ['/chat', './chatRoutes'],
  ['/checkbooks', './checkbookRoutes'],
  ['/ocr', './ocrRoutes'],
  ['/term-deposits', './termDepositRoutes'],
  ['/expense-categories', './expenseCategoryRoutes'],
  ['/aml', './amlRoutes'],
  ['/reviews', './reviewRoutes'],
  ['/scheduled-payments', './scheduledPaymentRoutes'],
];

routes.forEach(([path, route]) => {
  router.use(path, require(route));
});

module.exports = router;
