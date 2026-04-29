/**
 * AML Compliance Routes
 * ─────────────────────
 * All routes require authentication + admin role.
 * manage_compliance permission required for sensitive operations.
 */
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getAmlDashboard,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  seedRules,
  getAlerts,
  getAlertById,
  updateAlertStatus,
  getSARs,
  createSAR,
  updateSAR,
  getSARById,
  getCTRs,
  reviewCTR,
} = require('../controllers/amlController');

// All AML routes require auth + admin
router.use(protect, admin);

// Dashboard
router.get('/dashboard', getAmlDashboard);

// Rules
router.get('/rules', getRules);
router.post('/rules', createRule);
router.post('/rules/seed', seedRules);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);

// Alerts
router.get('/alerts', getAlerts);
router.get('/alerts/:id', getAlertById);
router.put('/alerts/:id/review', updateAlertStatus);

// Suspicious Activity Reports
router.get('/sar', getSARs);
router.post('/sar', createSAR);
router.get('/sar/:id', getSARById);
router.put('/sar/:id', updateSAR);

// Currency Transaction Reports
router.get('/ctr', getCTRs);
router.put('/ctr/:id/review', reviewCTR);

module.exports = router;
