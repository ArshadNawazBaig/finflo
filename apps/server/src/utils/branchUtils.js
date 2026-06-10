/**
 * Branch helpers shared by member-creation flows.
 *
 * A tenant must have at least one branch before any member can be created, and
 * every new member is attributed to the tenant's *default* branch unless an
 * explicit branch is chosen. These helpers centralise both checks so every
 * creation path (admin create, bulk import, public self-register, Google
 * register) behaves identically.
 */
const Branch = require('../models/Branch');

/**
 * Resolve a tenant's default branch id.
 * Prefers the branch explicitly flagged `isDefault`; falls back to the oldest
 * branch so a tenant that predates the default-branch feature still resolves to
 * a stable branch. Returns null when the tenant has no branches at all.
 *
 * @param {ObjectId|string} ownerId - the tenant (effective owner) id
 * @returns {Promise<ObjectId|null>}
 */
const getDefaultBranchId = async (ownerId) => {
  if (!ownerId) return null;
  const flagged = await Branch.findOne({ owner: ownerId, isDefault: true }).select('_id');
  if (flagged) return flagged._id;
  const oldest = await Branch.findOne({ owner: ownerId }).sort({ createdAt: 1 }).select('_id');
  return oldest ? oldest._id : null;
};

/**
 * Whether a tenant has at least one branch. Member creation is blocked until
 * this is true.
 *
 * @param {ObjectId|string} ownerId
 * @returns {Promise<boolean>}
 */
const hasAnyBranch = async (ownerId) => {
  if (!ownerId) return false;
  return (await Branch.countDocuments({ owner: ownerId })) > 0;
};

module.exports = { getDefaultBranchId, hasAnyBranch };
