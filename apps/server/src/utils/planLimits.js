const SystemSettings = require('../models/SystemSettings');

const DEFAULT_PLAN_LIMITS = {
  Free: {
    loans: 5,
    members: 1,
    customers: 10,
    users: 1,
    features: ['basic_reporting', 'email_support'],
  },
  Basic: {
    loans: 50,
    members: 3,
    customers: 100,
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
 * Get dynamic limits for a plan from SystemSettings
 * @param {string} planName - Name of the plan
 * @returns {Promise<object>}
 */
const getDynamicLimits = async (planName) => {
  try {
    const settings = await SystemSettings.getSettings();
    const plan = settings.subscriptionPlans.find(
      (p) => p.name.toLowerCase() === planName.toLowerCase(),
    );

    if (plan && plan.limits) {
      return {
        loans: plan.limits.maxLoans === -1 ? Infinity : plan.limits.maxLoans,
        members:
          plan.limits.maxMembers === -1 ? Infinity : plan.limits.maxMembers,
        customers:
          plan.limits.maxCustomers === -1 ? Infinity : plan.limits.maxCustomers,
        users: plan.name === 'Pro' ? Infinity : plan.name === 'Basic' ? 3 : 1, // Features not fully in limits schema yet
        features: plan.features || DEFAULT_PLAN_LIMITS[planName]?.features,
      };
    }
  } catch (error) {
    console.error('Error fetching dynamic limits:', error);
  }

  return DEFAULT_PLAN_LIMITS[planName] || DEFAULT_PLAN_LIMITS.Free;
};

/**
 * Check if a user can create a new loan based on their plan
 * @param {string} plan - User's current plan (Free, Basic, Pro)
 * @param {number} currentCount - Current number of loans
 * @returns {Promise<object>} { allowed: boolean, limit: number, message: string }
 */
const canCreateLoan = async (plan, currentCount) => {
  const limits = await getDynamicLimits(plan);
  const limit = limits.loans;

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
 * @returns {Promise<object>} { allowed: boolean, limit: number, message: string }
 */
const canAddUser = async (plan, currentCount) => {
  const limits = await getDynamicLimits(plan);
  const limit = limits.users;

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
 * @param {string} planName - User's current plan
 * @param {string} feature - Feature to check
 * @returns {Promise<boolean>}
 */
const hasFeature = async (planName, feature) => {
  const limits = await getDynamicLimits(planName);
  const features = limits.features || [];
  return features.includes(feature) || features.includes('all');
};

/**
 * Get plan limits for a specific plan
 * @param {string} plan - Plan name
 * @returns {Promise<object>} Plan limits
 */
const getPlanLimits = async (plan) => {
  return await getDynamicLimits(plan);
};

/**
 * Get usage percentage for loans
 * @param {string} plan - User's current plan
 * @param {number} currentCount - Current number of loans
 * @returns {Promise<number>} Percentage (0-100)
 */
const getLoanUsagePercentage = async (plan, currentCount) => {
  const limits = await getDynamicLimits(plan);
  const limit = limits.loans;
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((currentCount / limit) * 100));
};

/**
 * Check if a new member can be added based on the plan
 * @param {string} plan - User's current plan
 * @param {number} currentCount - Current number of members
 * @returns {Promise<object>} { allowed: boolean, limit: number, message: string }
 */
const canAddMember = async (plan, currentCount) => {
  const limits = await getDynamicLimits(plan);
  const limit = limits.members;

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
 * @returns {Promise<object>} { allowed: boolean, limit: number, message: string }
 */
const canAddCustomer = async (plan, currentCount) => {
  const limits = await getDynamicLimits(plan);
  const limit = limits.customers;

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
  PLAN_LIMITS: DEFAULT_PLAN_LIMITS,
  canCreateLoan,
  canAddUser,
  canAddMember,
  canAddCustomer,
  hasFeature,
  getPlanLimits,
  getLoanUsagePercentage,
};
