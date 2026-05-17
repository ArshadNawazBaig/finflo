const User = require('../models/User');
const Branch = require('../models/Branch');

// Convert a Tailwind-style HSL triplet ("H S% L%") to a "#rrggbb" string.
// Used by email templates (which can't reference CSS variables) to colorize
// headers/buttons in the tenant's primary accent. Returns null when the
// input isn't a parseable HSL triplet so callers can fall back to a safe
// default.
const hslTripletToHex = (hslStr) => {
  if (!hslStr || typeof hslStr !== 'string') return null;
  const m = hslStr.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  const h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m2 = l - c / 2;
  const toHex = (v) => {
    const clamped = Math.max(0, Math.min(255, Math.round((v + m2) * 255)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
};

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
  let brandColor = null;

  // 1. Try branch-level branding first (highest priority)
  if (branchId) {
    try {
      const branch = await Branch.findById(branchId).lean();
      if (branch?.branding?.companyName) brandName = branch.branding.companyName;
      else if (branch?.name) brandName = branch.name;
      if (branch?.branding?.logoUrl) logoUrl = branch.branding.logoUrl;
      if (branch?.primaryColor) brandColor = hslTripletToHex(branch.primaryColor);
    } catch (_) {
      // Branch lookup failed, fall through to owner
    }
  }

  // 2. If branch didn't provide branding, resolve the admin owner's info
  if (brandName === 'FinFlo' || !logoUrl || !brandColor) {
    try {
      let owner;
      if (reqUser.role === 'staff') {
        // Staff/Manager: always fetch the actual admin owner
        owner = await User.findById(reqUser.ownerId || reqUser.effectiveOwnerId)
          .select('businessName name businessLogo primaryColor')
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
        if (!brandColor && owner.primaryColor) {
          brandColor = hslTripletToHex(owner.primaryColor);
        }
      }
    } catch (_) {
      // Owner lookup failed, keep defaults
    }
  }

  return { brandName, logoUrl, brandColor };
};

module.exports = { getEmailBranding, hslTripletToHex };
