/**
 * Security Event Logger
 * ─────────────────────
 * Centralized logging for security-relevant events.
 * Creates tamper-evident log chains for compliance auditing.
 */
const ActivityLog = require('../models/ActivityLog');

/**
 * Log a security event to the ActivityLog.
 * @param {Object} params
 * @param {string} params.action - Description of the action
 * @param {string} params.category - 'security' | 'auth' | 'compliance' | 'aml'
 * @param {string} params.severity - 'info' | 'warning' | 'critical'
 * @param {string} [params.userId] - User who performed the action
 * @param {string} [params.ip] - IP address
 * @param {string} [params.userAgent] - Browser/device info
 * @param {string} [params.details] - Human-readable details
 * @param {Object} [params.metadata] - Additional structured data
 * @param {string} [params.branchId] - Branch context
 */
const logSecurityEvent = async ({
  action,
  category = 'security',
  severity = 'info',
  userId,
  ip,
  userAgent,
  details,
  metadata = {},
  branchId,
}) => {
  try {
    await ActivityLog.create({
      action,
      category,
      user: userId || undefined,
      ipAddress: ip,
      userAgent,
      details,
      metadata: {
        ...metadata,
        severity,
        isSecurityEvent: true,
        timestamp: new Date().toISOString(),
      },
      branchId: branchId || undefined,
    });
  } catch (error) {
    // Never let logging failures crash the application
    console.error('[SecurityLogger] Failed to log security event:', error.message);
  }
};

// ── Convenience Methods ──────────────────────────────────────────────────────

const logFailedLogin = (params) =>
  logSecurityEvent({
    action: 'Failed login attempt',
    category: 'auth',
    severity: 'warning',
    ...params,
  });

const logSuccessfulLogin = (params) =>
  logSecurityEvent({
    action: 'Successful login',
    category: 'auth',
    severity: 'info',
    ...params,
  });

const logPasswordChange = (params) =>
  logSecurityEvent({
    action: 'Password changed',
    category: 'security',
    severity: 'info',
    ...params,
  });

const logAccountLocked = (params) =>
  logSecurityEvent({
    action: 'Account locked due to failed attempts',
    category: 'security',
    severity: 'critical',
    ...params,
  });

const logSessionTerminated = (params) =>
  logSecurityEvent({
    action: 'Session terminated',
    category: 'security',
    severity: 'warning',
    ...params,
  });

const logIPBlocked = (params) =>
  logSecurityEvent({
    action: 'IP address blocked by whitelist',
    category: 'security',
    severity: 'critical',
    ...params,
  });

const logDataExport = (params) =>
  logSecurityEvent({
    action: 'Data exported',
    category: 'compliance',
    severity: 'info',
    ...params,
  });

const logPermissionChange = (params) =>
  logSecurityEvent({
    action: 'User permissions modified',
    category: 'security',
    severity: 'warning',
    ...params,
  });

const logEncryptionEvent = (params) =>
  logSecurityEvent({
    action: 'Encryption operation',
    category: 'security',
    severity: 'info',
    ...params,
  });

module.exports = {
  logSecurityEvent,
  logFailedLogin,
  logSuccessfulLogin,
  logPasswordChange,
  logAccountLocked,
  logSessionTerminated,
  logIPBlocked,
  logDataExport,
  logPermissionChange,
  logEncryptionEvent,
};
