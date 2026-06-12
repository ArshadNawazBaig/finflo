const DeviceToken = require('../models/DeviceToken');

// Derive the device actor from the authenticated request. Member app requests
// carry `req.member`; business app requests carry `req.user`. Returns the
// tenant-owner id (`user`), the device `owner` id, and `ownerType`.
const resolveActor = (req) => {
  if (req.member) {
    return {
      user: req.member.user,
      owner: req.member._id,
      ownerType: 'Member',
    };
  }
  if (req.user) {
    return {
      user: req.user.effectiveOwnerId,
      owner: req.user._id,
      ownerType: 'User',
    };
  }
  return null;
};

// @desc   Register (or refresh) a push device token
// @route  POST /api/device-tokens/register | /staff/register
// @access Private (member or user)
const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token is required' });

    const actor = resolveActor(req);
    if (!actor) return res.status(401).json({ message: 'Not authenticated' });

    // Upsert by token: a token is globally unique to a device, so re-registering
    // the same token (e.g. after re-login or owner switch) updates in place.
    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      {
        $set: {
          user: actor.user,
          owner: actor.owner,
          ownerType: actor.ownerType,
          platform,
          isActive: true,
          lastSeenAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Unregister a push device token (deactivate)
// @route  POST /api/device-tokens/unregister | /staff/unregister
// @access Private (member or user)
const unregisterDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'token is required' });

    const actor = resolveActor(req);
    if (!actor) return res.status(401).json({ message: 'Not authenticated' });

    // Only the caller's own token may be deactivated — scope by owner so one
    // device owner can't unregister another's token.
    await DeviceToken.findOneAndUpdate(
      { token, owner: actor.owner, ownerType: actor.ownerType },
      { $set: { isActive: false } },
    );

    res.status(200).json({ message: 'Device token unregistered' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerDeviceToken, unregisterDeviceToken };
