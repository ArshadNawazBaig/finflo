const User = require('../models/User');
const Branch = require('../models/Branch');

/**
 * Resolves the correct brand name and logo for email templates.
 * For staff/manager users, always resolves the admin owner's business name
 * and logo — never the staff member's personal name.
 *
 * @param {Object} reqUser - The req.user object from auth middleware
 * @param {String|ObjectId} branchId - The branch ID for this context (e.g., loan.branchId)
 * @returns {Promise<{ brandName: string, logoUrl: string|null }>}
 */
const getEmailBranding = async (reqUser, branchId) => {
  let brandName = 'FinFlo';
  let logoUrl = null;

  // 1. Try branch-level branding first (highest priority)
  if (branchId) {
    try {
      const branch = await Branch.findById(branchId).lean();
      if (branch?.branding?.companyName) brandName = branch.branding.companyName;
      else if (branch?.name) brandName = branch.name;
      if (branch?.branding?.logoUrl) logoUrl = branch.branding.logoUrl;
    } catch (_) {
      // Branch lookup failed, fall through to owner
    }
  }

  // 2. If branch didn't provide branding, resolve the admin owner's info
  if (brandName === 'FinFlo' || !logoUrl) {
    try {
      let owner;
      if (reqUser.role === 'staff') {
        // Staff/Manager: always fetch the actual admin owner
        owner = await User.findById(reqUser.ownerId || reqUser.effectiveOwnerId)
          .select('businessName name businessLogo')
          .lean();
      } else {
        // Admin themselves
        owner = reqUser;
      }

      if (owner) {
        if (brandName === 'FinFlo') {
          brandName = owner.businessName || owner.name || 'FinFlo';
        }
        if (!logoUrl) {
          logoUrl = owner.businessLogo || null;
        }
      }
    } catch (_) {
      // Owner lookup failed, keep defaults
    }
  }

  return { brandName, logoUrl };
};

module.exports = { getEmailBranding };
