const PLAN_LIMITS = {
  Free: {
    loans: 10,
    members: 10,
    customers: 10,
    users: 1,
    features: ['basic_reporting', 'email_support'],
  },
  Basic: {
    loans: 1000,
    members: 1000,
    customers: 1000,
    users: 3,
    features: [
      'basic_reporting',
      'advanced_reporting',
      'priority_email_support',
      'custom_branding',
    ],
  },
  Pro: {
    loans: Infinity,
    members: Infinity,
    customers: Infinity,
    users: Infinity,
    features: [
      'basic_reporting',
      'advanced_reporting',
      'advanced_analytics',
      'priority_support',
      'unlimited_users',
      'api_access',
      'custom_branding',
    ],
  },
};

/**
 * Check if a user can create a new loan based on their plan
 * @param {string} plan - User's current plan (Free, Basic, Pro)
 * @param {number} currentCount - Current number of loans
 * @returns {object} { allowed: boolean, limit: number, message: string }
 */
const canCreateLoan = (plan, currentCount) => {
  const limit = PLAN_LIMITS[plan]?.loans || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      current: currentCount,
      message: `You've reached your ${plan} plan limit of ${limit} loans. Upgrade to add more.`,
    };
  }

  return {
    allowed: true,
    limit,
    current: currentCount,
    message: 'You can create a new loan.',
  };
};

/**
 * Check if a new user can be added based on the plan
 * @param {string} plan - Organization's current plan
 * @param {number} currentCount - Current number of users
 * @returns {object} { allowed: boolean, limit: number, message: string }
 */
const canAddUser = (plan, currentCount) => {
  const limit = PLAN_LIMITS[plan]?.users || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      current: currentCount,
      message: `You've reached your ${plan} plan limit of ${limit} user(s). Upgrade to add more.`,
    };
  }

  return {
    allowed: true,
    limit,
    current: currentCount,
    message: 'You can add a new user.',
  };
};

/**
 * Check if a plan has access to a specific feature
 * @param {string} plan - User's current plan
 * @param {string} feature - Feature to check
 * @returns {boolean}
 */
const hasFeature = (plan, feature) => {
  const features = PLAN_LIMITS[plan]?.features || [];
  return features.includes(feature) || features.includes('all');
};

/**
 * Get plan limits for a specific plan
 * @param {string} plan - Plan name
 * @returns {object} Plan limits
 */
const getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
};

/**
 * Get usage percentage for loans
 * @param {string} plan - User's current plan
 * @param {number} currentCount - Current number of loans
 * @returns {number} Percentage (0-100)
 */
const getLoanUsagePercentage = (plan, currentCount) => {
  const limit = PLAN_LIMITS[plan]?.loans || 0;
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((currentCount / limit) * 100));
};

/**
 * Check if a new member can be added based on the plan
 * @param {string} plan - User's current plan
 * @param {number} currentCount - Current number of members
 * @returns {object} { allowed: boolean, limit: number, message: string }
 */
const canAddMember = (plan, currentCount) => {
  const limit = PLAN_LIMITS[plan]?.members || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      current: currentCount,
      message: `You've reached your ${plan} plan limit of ${limit} members. Upgrade to add more.`,
    };
  }

  return {
    allowed: true,
    limit,
    current: currentCount,
    message: 'You can add a new member.',
  };
};

/**
 * Check if a new customer can be added based on the plan
 * @param {string} plan - User's current plan
 * @param {number} currentCount - Current number of customers
 * @returns {object} { allowed: boolean, limit: number, message: string }
 */
const canAddCustomer = (plan, currentCount) => {
  const limit = PLAN_LIMITS[plan]?.customers || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      limit,
      current: currentCount,
      message: `You've reached your ${plan} plan limit of ${limit} customers. Upgrade to add more.`,
    };
  }

  return {
    allowed: true,
    limit,
    current: currentCount,
    message: 'You can add a new customer.',
  };
};

module.exports = {
  PLAN_LIMITS,
  canCreateLoan,
  canAddUser,
  canAddMember,
  canAddCustomer,
  hasFeature,
  getPlanLimits,
  getLoanUsagePercentage,
};
